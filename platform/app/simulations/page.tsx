import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Simulation catalog (feature spec section 3: choose industry, then position). */
export default async function SimulationsPage() {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: simulations } = await supabase
    .from("simulations")
    .select("id, slug, industry, position_title, brief, estimated_minutes")
    .order("industry");

  const byIndustry = new Map<string, typeof simulations>();
  for (const sim of simulations ?? []) {
    const list = byIndustry.get(sim.industry) ?? [];
    list.push(sim);
    byIndustry.set(sim.industry, list);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Job simulation</h1>
      <p className="mt-2 text-sm text-gray-600">
        Choose an industry and position, then complete a realistic work task and get
        rubric-based feedback.
      </p>

      <div className="mt-8 space-y-8">
        {[...byIndustry.entries()].map(([industry, items]) => (
          <section key={industry}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {industry}
            </h2>
            <div className="mt-3 space-y-3">
              {items?.map((sim) => (
                <Link
                  key={sim.id}
                  href={`/simulations/${sim.slug}`}
                  className="block rounded-md border border-gray-200 p-4 hover:border-gray-400"
                >
                  <p className="font-medium text-gray-900">{sim.position_title}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    ~{sim.estimated_minutes} min · {sim.brief}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {(simulations ?? []).length === 0 && (
        <p className="mt-8 text-sm text-gray-500">No simulations are published yet.</p>
      )}
    </main>
  );
}
