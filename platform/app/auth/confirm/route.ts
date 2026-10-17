import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

/**
 * Handles email verification and password-recovery links (AUTH-003).
 * Consumes the one-time token and establishes a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const redirect = (path: string) => NextResponse.redirect(`${origin}${path}`, {
    headers: { "Cache-Control": "private, no-store" },
  });
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const validEmailTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

  if (!code && (!tokenHash || !validEmailTypes.includes(type as EmailOtpType))) {
    return redirect("/signin?error=invalid_link");
  }

  const supabase = await createServerSupabaseClient();
  // Supabase's default email template redirects PKCE signups/recovery with
  // ?code=. Custom templates may use the token_hash flow; support both.
  const { data, error } = await (code
    ? supabase.auth.exchangeCodeForSession(code)
    : supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash! })
  ).catch(() => ({ data: { user: null }, error: { name: "AuthRetryableFetchError", status: 503, code: undefined } }));

  if (error || !data.user) {
    const failure = error && (error.name === "AuthRetryableFetchError" || (error.status ?? 0) >= 500)
      ? "service_unavailable"
      : error && (error.name === "AuthPKCECodeVerifierMissingError" || error.code === "pkce_code_verifier_not_found" || error.code === "bad_code_verifier")
      ? "browser_context_missing"
      : "expired_link";
    // Never log the callback URL, one-time code, token, email or provider body.
    logger.warn("Email confirmation failed", { route: "/auth/confirm", operation: code ? "pkce_exchange" : "otp_verify", status: error?.status, error_code: failure });
    return redirect(`/signin?error=${failure}`);
  }

  // Recovery links must land on the password form, not the dashboard,
  // otherwise the user is signed in without ever setting a new password.
  const isRecovery = type === "recovery" || ("redirectType" in data && data.redirectType === "recovery");
  const destination = isRecovery ? "/update-password" : data.user.user_metadata.account_intent === "business" ? "/business" : "/dashboard";
  return redirect(destination);
}
