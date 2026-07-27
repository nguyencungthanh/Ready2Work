import Link from "next/link";
import { signInAction } from "../actions";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
      <p className="mt-2 mb-6 text-sm text-muted">Welcome back.</p>

      {error === "expired_link" && (
        <p role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          That link has expired or was already used. Please request a new one.
        </p>
      )}
      {error === "invalid_link" && (
        <p role="alert" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          That link was not valid. Please try again.
        </p>
      )}

      <AuthForm
        action={signInAction}
        submitLabel="Sign in"
        hidden={next ? { next } : undefined}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />

      <div className="mt-6 space-y-2 text-sm text-muted">
        <p>
          <Link href="/reset-password" className="font-medium text-primary underline transition-colors duration-200">
            Forgot your password?
          </Link>
        </p>
        <p>
          No account?{" "}
          <Link href="/signup" className="font-medium text-primary underline transition-colors duration-200">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
