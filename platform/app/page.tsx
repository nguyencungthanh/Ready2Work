import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold text-gray-900">Ready2Work</h1>
      <p className="mt-3 text-base text-gray-600">
        Career discovery, roadmaps, and job simulations for people deciding what to do next.
      </p>

      <div className="mt-8 flex gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Create account
            </Link>
            <Link
              href="/signin"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
