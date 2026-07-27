"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { roleApplicationSchema } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { logger } from "@/lib/observability/logger";
import type { FormState } from "../(auth)/actions";

/** AUTH-011: submit a Mentor/Employer role application for admin review. */
export async function applyForRoleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = roleApplicationSchema.safeParse({
    requestedRole: formData.get("requestedRole"),
    justification: formData.get("justification"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("role_applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("requested_role", parsed.data.requestedRole)
    .in("status", ["submitted", "under_review"])
    .maybeSingle();

  if (existing) {
    return { error: "You already have an application awaiting review." };
  }

  const { error } = await supabase.from("role_applications").insert({
    user_id: user.id,
    requested_role: parsed.data.requestedRole,
    justification: parsed.data.justification,
  });

  if (error) {
    logger.error("role_application_failed", {
      domain: "auth",
      operation: "applyForRole",
      error_code: error.code ?? "UNKNOWN",
    });
    return { error: "We could not submit your application. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: "Application submitted. An admin will review it shortly." };
}

/**
 * AUTH-013: export the user's own data. Reads run as the user so RLS is the
 * enforcement boundary - a bug here cannot leak another account's records.
 */
export async function exportMyDataAction(): Promise<FormState> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const [profile, roles, consents, applications] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role, granted_at").eq("user_id", user.id),
    supabase.from("consent_records").select("*").eq("user_id", user.id),
    supabase.from("role_applications").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    roles: roles.data ?? [],
    consents: consents.data ?? [],
    roleApplications: applications.data ?? [],
  };

  // Audit the export itself (section 25.6).
  const admin = createServiceRoleClient();
  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "account.export",
    target_type: "profile",
    target_id: user.id,
  });

  return { success: JSON.stringify(payload, null, 2) };
}

/**
 * AUTH-013: request deletion. Marks the account rather than hard-deleting, so
 * the scheduled job can anonymize while retaining required audit records
 * (section 8.9).
 */
export async function requestAccountDeletionAction(): Promise<FormState> {
  const user = await requireUser();
  const admin = createServiceRoleClient();

  const { error } = await admin
    .from("profiles")
    .update({ account_status: "deletion_requested" })
    .eq("id", user.id);

  if (error) {
    logger.error("account_deletion_request_failed", {
      domain: "auth",
      operation: "requestAccountDeletion",
      error_code: error.code ?? "UNKNOWN",
    });
    return { error: "We could not process that request. Please try again." };
  }

  await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "account.deletion_requested",
    target_type: "profile",
    target_id: user.id,
  });

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}
