"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { logger } from "@/lib/observability/logger";
import type { FormState } from "../(auth)/actions";

const decisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(2000).optional(),
});

/**
 * AUTH-011: approve or reject a role application. Admin-gated, service-role
 * write, and audited. A user can never reach this path for their own
 * application because requireRole rejects non-admins first.
 */
export async function decideRoleApplicationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireRole("admin", "super_admin");

  const parsed = decisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid decision request." };
  }

  const service = createServiceRoleClient();

  const { data: application, error: loadError } = await service
    .from("role_applications")
    .select("id, user_id, requested_role, status")
    .eq("id", parsed.data.applicationId)
    .maybeSingle();

  if (loadError || !application) {
    return { error: "Application not found." };
  }

  if (application.status !== "submitted" && application.status !== "under_review") {
    return { error: "That application has already been decided." };
  }

  // Reviewers must not decide their own application (section 2.3).
  if (application.user_id === admin.id) {
    return { error: "You cannot decide your own application." };
  }

  const { error: updateError } = await service
    .from("role_applications")
    .update({
      status: parsed.data.decision,
      reviewer_id: admin.id,
      review_notes: parsed.data.notes ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", application.id);

  if (updateError) {
    logger.error("role_decision_failed", {
      domain: "auth",
      operation: "decideRoleApplication",
      error_code: updateError.code ?? "UNKNOWN",
    });
    return { error: "Could not record that decision." };
  }

  if (parsed.data.decision === "approved") {
    const { error: grantError } = await service
      .from("user_roles")
      .insert({ user_id: application.user_id, role: application.requested_role, granted_by: admin.id });

    if (grantError && grantError.code !== "23505") {
      logger.error("role_grant_failed", {
        domain: "auth",
        operation: "decideRoleApplication",
        error_code: grantError.code ?? "UNKNOWN",
      });
      return { error: "Decision saved but the role could not be granted." };
    }
  }

  await service.from("audit_logs").insert({
    actor_id: admin.id,
    action: `role_application.${parsed.data.decision}`,
    target_type: "role_application",
    target_id: application.id,
    detail: { requested_role: application.requested_role },
  });

  revalidatePath("/admin/role-applications");
  return { success: `Application ${parsed.data.decision}.` };
}

const suspensionSchema = z.object({
  userId: z.string().uuid(),
  suspend: z.enum(["true", "false"]),
  reason: z.string().max(2000).optional(),
});

/** AUTH-012: suspend or reinstate an account. */
export async function setSuspensionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireRole("admin", "super_admin");

  const parsed = suspensionSchema.safeParse({
    userId: formData.get("userId"),
    suspend: formData.get("suspend"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid suspension request." };
  }

  if (parsed.data.userId === admin.id) {
    return { error: "You cannot suspend your own account." };
  }

  const suspend = parsed.data.suspend === "true";
  const service = createServiceRoleClient();

  const { error } = await service
    .from("profiles")
    .update({ account_status: suspend ? "suspended" : "active" })
    .eq("id", parsed.data.userId);

  if (error) {
    logger.error("suspension_failed", {
      domain: "auth",
      operation: "setSuspension",
      error_code: error.code ?? "UNKNOWN",
    });
    return { error: "Could not update that account." };
  }

  await service.from("audit_logs").insert({
    actor_id: admin.id,
    action: suspend ? "account.suspended" : "account.reinstated",
    target_type: "profile",
    target_id: parsed.data.userId,
    detail: parsed.data.reason ? { reason: parsed.data.reason } : {},
  });

  revalidatePath("/admin/users");
  return { success: suspend ? "Account suspended." : "Account reinstated." };
}
