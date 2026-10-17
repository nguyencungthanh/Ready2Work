"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth/redirect";
import { authErrorMessage } from "@/lib/auth/error-message";
import {
  requestPasswordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/schemas";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

function toFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    displayName: formData.get("displayName"),
    acceptTerms: formData.get("acceptTerms") === "on",
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName, account_intent: formData.get("accountType") === "business" ? "business" : "candidate" },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  }).catch(() => ({ error: { name: "AuthRetryableFetchError" } }));

  if (error) {
    return { error: authErrorMessage(error, "signup") };
  }

  // Generic wording either way: revealing "already registered" would let an
  // attacker enumerate which emails have accounts (section 8.6).
  redirect("/verify-email");
}

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  }).catch(() => ({ data: { user: null }, error: { name: "AuthRetryableFetchError" } }));

  if (error || !data.user) {
    // Same message for wrong password and unknown email, to avoid
    // account enumeration.
    return { error: authErrorMessage(error) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_status === "suspended") {
    await supabase.auth.signOut();
    redirect("/suspended");
  }

  const next = formData.get("next");
  revalidatePath("/", "layout");
  // Account intent chooses the onboarding screen; all permissions still use DB roles.
  redirect(safeReturnPath(next, data.user.user_metadata.account_intent === "business" ? "/business" : "/dashboard"));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?type=recovery`,
  }).catch(() => ({ error: { name: "AuthRetryableFetchError" } }));
  if (error) return { error: authErrorMessage(error, "reset") };

  // Always report success, whether or not the account exists.
  return { success: "Nếu email có tài khoản, bạn sẽ nhận được liên kết đặt lại mật khẩu." };
}

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password }).catch(() => ({ error: { name: "AuthRetryableFetchError" } }));

  if (error) {
    return { error: authErrorMessage(error, "password") };
  }

  redirect("/dashboard");
}
