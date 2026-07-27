import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>
      <p className="mt-2 mb-6 text-sm text-gray-600">
        Enter your email and we will send you a reset link.
      </p>

      <AuthForm
        action={requestPasswordResetAction}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />

      <p className="mt-6 text-sm text-gray-600">
        <Link href="/signin" className="font-medium text-gray-900 underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
