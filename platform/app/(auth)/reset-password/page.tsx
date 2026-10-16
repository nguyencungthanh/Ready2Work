import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main className="w-full">
      <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        Enter your email and we will send you a reset link.
      </p>

      <AuthForm
        action={requestPasswordResetAction}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />

      <p className="mt-6 text-sm text-muted">
        <Link href="/signin" className="font-medium text-primary underline transition-colors duration-200">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
