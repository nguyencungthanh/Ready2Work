import Link from "next/link";

export const metadata = { title: "Not allowed" };

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">You do not have access</h1>
      <p className="mt-3 text-sm text-gray-600">
        This area needs a role your account does not have yet.
      </p>
      <p className="mt-6 text-sm text-gray-600">
        <Link href="/dashboard" className="font-medium text-gray-900 underline">
          Back to dashboard
        </Link>
      </p>
    </main>
  );
}
