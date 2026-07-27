import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Ready2Work</h1>
      <p className="mt-3 text-base text-muted">
        Career discovery, roadmaps, and job simulations for people deciding what to do next.
      </p>

      <div className="mt-8 flex gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors duration-200"
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors duration-200"
            >
              Create account
            </Link>
            <Link
              href="/signin"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors duration-200"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
