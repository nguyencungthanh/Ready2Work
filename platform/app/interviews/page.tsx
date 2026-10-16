import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Feature 4 catalog: choose an industry, then a general or company-specific set. */
export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ position?: string }> }) {
  const user = await requireUser();
  const filters = await searchParams;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("interview_sets")
    .select("id, slug, industry, position_title, company_name, description, is_available, unavailable_reason, position_id")
    .order("industry");
  if (filters.position) query = query.eq("position_id", filters.position);
  const { data: sets, error } = await query;
  if (error) throw new Error("Could not load interview questions. Please try again.");

  const byIndustry = new Map<string, typeof sets>();
  for (const set of sets ?? []) {
    if (!byIndustry.has(set.industry)) byIndustry.set(set.industry, []);
    byIndustry.get(set.industry)!.push(set);
  }

  return (
    <AppShell active="interviews" displayName={user.displayName}><main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Interview Practice</h1>
      <p className="mt-2 text-sm text-muted">
        Choose an industry, then a general or company-specific three-round interview. Answers are
        scored on content only - accent, voice, and identity are never scoring criteria.
      </p>
      {filters.position && <p className="mt-4 text-sm text-muted">Nội dung phù hợp với vị trí mục tiêu. <Link href="/interviews" className="font-semibold text-primary">Xem tất cả vị trí →</Link></p>}
      {!sets?.length && <p className="mt-7 rounded-xl border border-border bg-white p-6 text-sm text-muted">Chưa có bộ câu hỏi cho vị trí này. Nội dung chỉ được mở khi nguồn có đủ ba vòng và tiêu chí chấm điểm.</p>}

      <div className="mt-8 space-y-8">
        {Array.from(byIndustry.keys()).map((industry) => {
          const industrySets = byIndustry.get(industry) ?? [];
          if (industrySets.length === 0) return null;
          return (
            <section key={industry}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {industry}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {industrySets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/interviews/${set.slug}`}
                    className="rounded-2xl border border-border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
                  >
                    <p className="font-medium text-foreground">
                      {set.company_name ? `${set.company_name} - ` : ""}
                      {set.position_title}
                    </p>
                    <p className="mt-1 text-sm text-muted">{set.description}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">{set.is_available ? "3 vòng · Đánh giá theo tiêu chí của vị trí" : set.unavailable_reason || "Đang bổ sung câu hỏi nguồn · Chưa mở"}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main></AppShell>
  );
}
