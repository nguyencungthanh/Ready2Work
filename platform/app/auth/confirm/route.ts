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
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/signin?error=invalid_link`);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=expired_link`);
  }

  // Recovery links must land on the password form, not the dashboard,
  // otherwise the user is signed in without ever setting a new password.
  const destination = type === "recovery" ? "/update-password" : data.user?.user_metadata.account_intent === "business" ? "/business" : "/dashboard";
  return NextResponse.redirect(`${origin}${destination}`);
}
