import Link from "next/link";
import { requireUser, hasRole } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AccountPanels } from "./panels";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: applications } = await supabase
    .from("role_applications")
    .select("id, requested_role, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell active="account" displayName={user.displayName}><main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Account</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <AccountPanels applications={applications ?? []} />
      <div className="mt-8 flex flex-wrap gap-5 text-sm font-semibold text-primary">
        <Link href="/business">Không gian doanh nghiệp →</Link>
        {hasRole(user, "mentor", "admin", "super_admin") && <Link href="/mentor">Đánh giá ứng viên →</Link>}
        {hasRole(user, "admin", "super_admin") && <Link href="/admin/role-applications">Duyệt yêu cầu vai trò →</Link>}
      </div>
    </main></AppShell>
  );
}
