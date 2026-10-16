import "server-only";

import { cache } from "react";
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
 * Uses verified JWT claims, never an unverified getSession() result. Supabase
 * validates the signature with cached signing keys and refreshes expired claims.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, account_status")
      .eq("id", claims.sub)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", claims.sub),
  ]);

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    displayName: profile?.display_name ?? "",
    accountStatus: (profile?.account_status ?? "active") as AccountStatus,
    roles: (roleRows ?? []).map((row) => row.role as AppRole),
  };
});

/**
 * Verifies whether a request has an authenticated session without loading the
 * user's profile and roles. Use this for presentation-only decisions such as
 * the landing-page navbar.
 */
export const hasAuthenticatedSession = cache(async (): Promise<boolean> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return false;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  return !error && Boolean(data?.claims.sub);
});

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
