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
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome{user.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{user.email}</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>

      <dl className="mt-8 space-y-4 rounded-lg border border-gray-200 p-5">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-gray-600">Account status</dt>
          <dd className="text-sm font-medium text-gray-900">{user.accountStatus}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-gray-600">Roles</dt>
          <dd className="text-sm font-medium text-gray-900">{user.roles.join(", ") || "none"}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-gray-900">Get started</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/career-discovery"
            className="rounded-lg border border-gray-200 p-5 hover:border-gray-400"
          >
            <p className="font-medium text-gray-900">Career Discovery</p>
            <p className="mt-1 text-sm text-gray-600">
              Take the RIASEC assessment and see your top 3 career matches.
            </p>
          </Link>
          <Link
            href="/roadmap/new"
            className="rounded-lg border border-gray-200 p-5 hover:border-gray-400"
          >
            <p className="font-medium text-gray-900">Personalized Roadmap</p>
            <p className="mt-1 text-sm text-gray-600">
              Generate a staged learning plan for a career you're targeting.
            </p>
          </Link>
          <Link
            href="/simulations"
            className="rounded-lg border border-gray-200 p-5 hover:border-gray-400"
          >
            <p className="font-medium text-gray-900">Job Simulation</p>
            <p className="mt-1 text-sm text-gray-600">
              Complete a realistic work task and get rubric-based feedback.
            </p>
          </Link>
          <Link
            href="/interviews"
            className="rounded-lg border border-gray-200 p-5 hover:border-gray-400"
          >
            <p className="font-medium text-gray-900">Interview Practice</p>
            <p className="mt-1 text-sm text-gray-600">
              Practice interview questions and get content-based feedback.
            </p>
          </Link>
        </div>
      </section>

      <div className="mt-8 flex gap-4 text-sm">
        <Link href="/account" className="font-medium text-gray-900 underline">
          Account settings
        </Link>
        {(user.roles.includes("admin") || user.roles.includes("super_admin")) && (
          <Link href="/admin/role-applications" className="font-medium text-gray-900 underline">
            Review role applications
          </Link>
        )}
      </div>
    </main>
  );
}
