import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CriterionResult } from "@/lib/simulation/evaluator";

/** Submission feedback (feature spec section 3: score, feedback, improvement suggestions). */
export default async function SimulationSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: submission } = await supabase
    .from("simulation_submissions")
    .select("id, user_id, simulation_id, overall_score, overall_band, criterion_scores, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.user_id !== user.id) notFound();

  const { data: simulation } = await supabase
    .from("simulations")
    .select("position_title, industry")
    .eq("id", submission.simulation_id)
    .maybeSingle();

  const criteria = (submission.criterion_scores as CriterionResult[] | null) ?? [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        Simulation feedback
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-gray-900">
        {simulation?.position_title} ({simulation?.industry})
      </h1>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-500">Overall score</p>
        <p className="mt-1 text-4xl font-semibold text-gray-900">
          {submission.overall_score}/100 · {submission.overall_band}
        </p>
        <p className="mt-3 text-xs text-gray-500">
          This is an automated learning evaluation, not a hiring decision. The rubric and evidence
          below are fully visible.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {criteria.map((criterion) => (
          <div key={criterion.criterionId} className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm font-semibold text-gray-900">
              {criterion.label} — {criterion.band} ({criterion.score}/{criterion.maxScore})
            </p>
            <p className="mt-2 text-sm text-gray-600">{criterion.description}</p>
            {criterion.matched.length > 0 && (
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Covered:</span> {criterion.matched.join(", ")}
              </p>
            )}
            {criterion.missing.length > 0 && (
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Consider addressing:</span>{" "}
                {criterion.missing.join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/simulations" className="text-sm font-medium text-gray-900 underline">
          Try another simulation
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-gray-900 underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
