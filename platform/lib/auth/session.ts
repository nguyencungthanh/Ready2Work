import "server-only";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppRole =
  | "mentee"
  | "mentor_pending"
  | "mentor"
  | "employer_pending"
  | "employer_member"
  | "employer_admin"
  | "content_reviewer"
  | "admin"
  | "super_admin";

export type AccountStatus =
  | "active"
  | "pending_verification"
  | "pending_role_approval"
  | "suspended"
  | "deletion_requested"
  | "deleted";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  accountStatus: AccountStatus;
  roles: AppRole[];
}

/**
 * Resolves the current user from the session cookie, or null when signed out.
 *
 * Always uses getUser() rather than getSession(): getSession() trusts the
 * cookie contents without contacting the auth server, so a forged cookie
 * could pass. getUser() validates the token server-side (section 9.4).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, account_status")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? "",
    accountStatus: (profile?.account_status ?? "active") as AccountStatus,
    roles: (roleRows ?? []).map((row) => row.role as AppRole),
  };
}

/**
 * Requires a usable signed-in account. Suspended and deleted accounts are
 * turned away even though their cookie is still cryptographically valid
 * (AUTH-012), so revocation takes effect without waiting for token expiry.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/signin");
  }
  if (user.accountStatus === "suspended") {
    redirect("/suspended");
  }
  if (user.accountStatus === "deleted") {
    redirect("/signin");
  }

  return user;
}

export function hasRole(user: SessionUser, ...roles: AppRole[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

/** Requires one of the given roles; sends unauthorized users to /forbidden. */
export async function requireRole(...roles: AppRole[]): Promise<SessionUser> {
  const user = await requireUser();

  if (!hasRole(user, ...roles)) {
    redirect("/forbidden");
  }

  return user;
}
