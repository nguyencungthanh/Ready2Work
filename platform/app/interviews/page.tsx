import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const INDUSTRIES = [
  "Accounting & Auditing",
  "Finance & Banking",
  "Information Technology",
  "Marketing",
  "Logistics",
] as const;

/** Feature 4 catalog: choose an industry, then a general or company-specific set. */
export default async function InterviewsPage() {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: sets } = await supabase
    .from("interview_sets")
    .select("id, slug, industry, position_title, company_name, description")
    .order("industry");

  const byIndustry = new Map<string, typeof sets>();
  for (const industry of INDUSTRIES) byIndustry.set(industry, []);
  for (const set of sets ?? []) {
    byIndustry.get(set.industry)?.push(set);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Interview Practice</h1>
      <p className="mt-2 text-sm text-gray-600">
        Choose an industry, then a general or company-specific interview round. Answers are
        scored on content only - accent, voice, and identity are never scoring criteria.
      </p>

      <div className="mt-8 space-y-8">
        {INDUSTRIES.map((industry) => {
          const industrySets = byIndustry.get(industry) ?? [];
          if (industrySets.length === 0) return null;
          return (
            <section key={industry}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {industry}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {industrySets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/interviews/${set.slug}`}
                    className="rounded-lg border border-gray-200 p-4 hover:border-gray-400"
                  >
                    <p className="font-medium text-gray-900">
                      {set.company_name ? `${set.company_name} - ` : ""}
                      {set.position_title}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">{set.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
