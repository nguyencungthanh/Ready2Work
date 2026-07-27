import { requireUser } from "@/lib/auth/session";
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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Account</h1>
      <p className="mt-1 text-sm text-gray-600">{user.email}</p>

      <AccountPanels applications={applications ?? []} />
    </main>
  );
}
