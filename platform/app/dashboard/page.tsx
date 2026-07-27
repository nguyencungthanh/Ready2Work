import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { signOutAction } from "../(auth)/actions";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome{user.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface transition-colors duration-200"
          >
            Sign out
          </button>
        </form>
      </div>

      <dl className="mt-8 space-y-4 rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-muted">Account status</dt>
          <dd>
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {user.accountStatus}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-muted">Roles</dt>
          <dd className="text-sm font-medium text-foreground">{user.roles.join(", ") || "none"}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Get started</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/career-discovery"
            className="rounded-2xl border border-border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
          >
            <p className="font-medium text-foreground">Career Discovery</p>
            <p className="mt-1 text-sm text-muted">
              Take the RIASEC assessment and see your top 3 career matches.
            </p>
          </Link>
          <Link
            href="/roadmap/new"
            className="rounded-2xl border border-border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
          >
            <p className="font-medium text-foreground">Personalized Roadmap</p>
            <p className="mt-1 text-sm text-muted">
              Generate a staged learning plan for a career you&apos;re targeting.
            </p>
          </Link>
          <Link
            href="/simulations"
            className="rounded-2xl border border-border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
          >
            <p className="font-medium text-foreground">Job Simulation</p>
            <p className="mt-1 text-sm text-muted">
              Complete a realistic work task and get rubric-based feedback.
            </p>
          </Link>
          <Link
            href="/interviews"
            className="rounded-2xl border border-border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
          >
            <p className="font-medium text-foreground">Interview Practice</p>
            <p className="mt-1 text-sm text-muted">
              Practice interview questions and get content-based feedback.
            </p>
          </Link>
        </div>
      </section>

      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/account" className="font-medium text-primary underline transition-colors duration-200">
          Account settings
        </Link>
        {(user.roles.includes("admin") || user.roles.includes("super_admin")) && (
          <Link href="/admin/role-applications" className="font-medium text-primary underline transition-colors duration-200">
            Review role applications
          </Link>
        )}
      </div>
    </main>
  );
}
