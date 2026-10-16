import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CriterionResult } from "@/lib/simulation/ai-evaluator";

interface StoredScores {
  summary: string;
  criteria: CriterionResult[];
}

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
    .select("id, user_id, simulation_id, overall_score, overall_band, criterion_scores, submitted_at, actual_duration_seconds")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.user_id !== user.id) notFound();

  const { data: simulation } = await supabase
    .from("simulations")
    .select("position_title, industry")
    .eq("id", submission.simulation_id)
    .maybeSingle();

  const stored = (submission.criterion_scores as StoredScores | null) ?? {
    summary: "",
    criteria: [],
  };
  const criteria = stored.criteria ?? [];

  return (
    <AppShell active="simulations" displayName={user.displayName}><main className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Simulation feedback
      </p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">
        {simulation?.position_title} ({simulation?.industry})
      </h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted">Overall score</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-4xl font-semibold text-foreground">{submission.overall_score}/100</p>
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {submission.overall_band}
          </span>
        </div>
        {submission.actual_duration_seconds !== null && <p className="mt-3 text-xs text-muted">Thời gian làm bài được ghi nhận: {Math.floor(submission.actual_duration_seconds / 60)} phút {submission.actual_duration_seconds % 60} giây.</p>}
        {stored.summary && (
          <p className="mt-3 text-sm text-foreground">{stored.summary}</p>
        )}
        <p className="mt-3 text-xs text-muted">
          This is an AI-assisted learning evaluation, not a hiring decision. The rubric and
          feedback below are fully visible.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        {criteria.map((criterion) => (
          <div key={criterion.criterionId} className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">
                {criterion.label} ({criterion.score}/{criterion.maxScore})
              </p>
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {criterion.band}
              </span>
            </div>

            {criterion.feedback && (
              <p className="mt-2 text-sm text-foreground">{criterion.feedback}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/report" className="text-sm font-medium text-primary underline">Xem báo cáo năng lực</Link>
        <Link href="/simulations" className="text-sm font-medium text-primary underline">
          Try another simulation
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-primary underline">
          Back to dashboard
        </Link>
      </div>
    </main></AppShell>
  );
}
