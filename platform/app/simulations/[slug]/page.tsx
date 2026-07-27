import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SubmissionForm } from "./submission-form";
import type { RubricCriterion } from "@/lib/simulation/evaluator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

/** Simulation brief and submission workspace (feature spec section 3, steps 3-5). */
export default async function SimulationDetailPage({ params }: PageProps) {
  await requireUser();
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: simulation } = await supabase
    .from("simulations")
    .select(
      "id, industry, position_title, brief, task_instructions, estimated_minutes, rubric, min_words",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!simulation) notFound();

  const rubric = simulation.rubric as RubricCriterion[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-sm font-medium text-gray-500">{simulation.industry}</p>
      <h1 className="mt-1 text-2xl font-semibold text-gray-900">{simulation.position_title}</h1>
      <p className="mt-3 text-gray-700">{simulation.brief}</p>

      <section className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Task</h2>
        <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
          {simulation.task_instructions}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Estimated time: ~{simulation.estimated_minutes} min. Write at least{" "}
          {simulation.min_words} words.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900">
          Scoring rubric (visible before you submit)
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-gray-700">
          {rubric.map((c) => (
            <li key={c.id}>
              {c.label} — {c.weight}%. {c.description}
            </li>
          ))}
        </ul>
      </section>

      <SubmissionForm simulationId={simulation.id} />
    </main>
  );
}
