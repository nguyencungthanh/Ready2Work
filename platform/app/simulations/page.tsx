import Link from "next/link";
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
  const byIndustry = new Map<string, NonNullable<typeof simulations>>();
  for (const simulation of simulations ?? []) {
    const list = byIndustry.get(simulation.industry) ?? [];
    list.push(simulation);
    byIndustry.set(simulation.industry, list);
  }
  return <AppShell active="simulations" displayName={user.displayName}>
    <main className="mx-auto max-w-6xl px-6 py-9 sm:px-8">
      <section className="rounded-3xl bg-[#073c4e] px-7 py-9 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#8ee3df]">Học qua trải nghiệm</p><h1 className="mt-3 text-3xl font-bold">Job simulation</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Thực hiện nhiệm vụ công việc thực tế, nhận đánh giá theo bộ tiêu chí của từng vị trí và từng bước thu hẹp khoảng cách kỹ năng.</p><p className="mt-5 inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-semibold">{simulations?.length ?? 0} nhiệm vụ {filters.position || filters.industry ? "phù hợp với lựa chọn" : "trong thư viện"}</p></section>
      {(filters.position || filters.industry) && <p className="mt-5 text-sm text-muted">Đang hiển thị nội dung phù hợp với vị trí hoặc lĩnh vực đã chọn. <Link href="/simulations" className="font-semibold text-primary">Xem toàn bộ thư viện →</Link></p>}
      <div className="mt-8 space-y-9">{Array.from(byIndustry.entries()).map(([industry, items]) => <section key={industry}><h2 className="text-lg font-bold">{industry}</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((simulation) => <Link key={simulation.id} href={`/simulations/${simulation.slug}`} className="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-colors hover:border-primary"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f7f3] text-xl text-primary" aria-hidden="true">↗</div><h3 className="font-bold">{simulation.position_title}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{simulation.brief}</p><div className="mt-auto pt-5"><p className="text-xs text-muted">Khoảng {simulation.estimated_minutes} phút · Chấm theo tiêu chí riêng</p><p className={`mt-3 text-sm font-semibold ${simulation.is_available ? "text-primary" : "text-amber-800"}`}>{simulation.is_available ? "Xem nhiệm vụ →" : simulation.unavailable_reason || "Đang chuẩn bị nội dung"}</p></div></Link>)}</div></section>)}</div>
      {!simulations?.length && <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-sm leading-6 text-muted">Chưa có mô phỏng phù hợp với lựa chọn này.<Link href="/simulations" className="mt-3 block font-semibold text-primary">Khám phá các vị trí khác →</Link></div>}
    </main>
  </AppShell>;
}
