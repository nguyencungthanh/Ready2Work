import Link from "next/link";
import { signUpAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
      <p className="mt-2 mb-6 text-sm text-gray-600">
        Start with career discovery. You can apply to be a mentor or employer later.
      </p>

      <AuthForm
        action={signUpAction}
        submitLabel="Create account"
        fields={[
          { name: "displayName", label: "Full name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password (at least 12 characters)",
            type: "password",
            autoComplete: "new-password",
          },
          {
            name: "confirmPassword",
            label: "Confirm password",
            type: "password",
            autoComplete: "new-password",
          },
        ]}
        checkbox={{ name: "acceptTerms", label: "I accept the terms of service and privacy policy" }}
      />

      <p className="mt-6 text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-gray-900 underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
