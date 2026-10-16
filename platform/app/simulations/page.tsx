import { ReferenceCatalog } from "@/components/reference/catalog";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SimulationsPage({ searchParams }: { searchParams: Promise<{ position?: string; industry?: string }> }) {
  const user = await requireUser();
  const filters = await searchParams;
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("simulations").select("id, slug, industry, position_title, brief, estimated_minutes, position_id, is_available, unavailable_reason").order("industry");
  if (filters.position) query = query.eq("position_id", filters.position);
  if (filters.industry) query = query.eq("industry", filters.industry);
  const { data: simulations, error } = await query;
  if (error) throw new Error("Could not load the simulation library. Please try again.");
  return <AppShell active="simulations" displayName={user.displayName}>
    <ReferenceCatalog kind="simulation" items={simulations ?? []} filtered={Boolean(filters.position || filters.industry)} />
  </AppShell>;
}
