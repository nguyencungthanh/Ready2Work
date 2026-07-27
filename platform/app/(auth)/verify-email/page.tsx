import Link from "next/link";

export const metadata = { title: "Check your email" };

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
      <p className="mt-3 text-sm text-muted">
        We sent you a verification link. Open it to activate your account and finish signing up.
      </p>
      <p className="mt-3 text-sm text-muted">
        In local development, open the mail catcher at{" "}
        <code className="rounded bg-navy-700 px-1 py-0.5">localhost:54324</code> to read the email.
      </p>
      <p className="mt-6 text-sm text-muted">
        <Link href="/signin" className="font-medium text-primary underline transition-colors duration-200">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
