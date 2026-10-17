import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Handles email verification and password-recovery links (AUTH-003).
 * Consumes the one-time token and establishes a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");
  const validEmailTypes: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

  if (!code && (!tokenHash || !validEmailTypes.includes(type as EmailOtpType))) {
    return NextResponse.redirect(`${origin}/signin?error=invalid_link`);
  }

  const supabase = await createServerSupabaseClient();
  // Supabase's default email template redirects PKCE signups/recovery with
  // ?code=. Custom templates may use the token_hash flow; support both.
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash! });

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/signin?error=expired_link`);
  }

  // Recovery links must land on the password form, not the dashboard,
  // otherwise the user is signed in without ever setting a new password.
  const isRecovery = type === "recovery" || ("redirectType" in data && data.redirectType === "recovery");
  const destination = isRecovery ? "/update-password" : data.user.user_metadata.account_intent === "business" ? "/business" : "/dashboard";
  return NextResponse.redirect(`${origin}${destination}`);
}
