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

      <p className="mt-8 text-sm text-gray-600">
        Career discovery, roadmaps, and simulations are not built yet. This dashboard confirms the
        authentication, profile, and role foundation works end to end.
      </p>

      <div className="mt-6 flex gap-4 text-sm">
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
