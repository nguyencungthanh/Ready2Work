import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  DIMENSION_LABELS,
  RIASEC_DIMENSIONS,
  topDimensions,
  type RiasecScores,
} from "@/lib/career/scoring";
import { SaveResultButton } from "./save-button";

export const metadata = { title: "Your career results" };

interface CareerRow {
  id: string;
  slug: string;
  title: string;
  industry: string;
  summary: string;
  typical_majors: string[];
  entry_roles: string[];
  key_skills: string[];
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: attempt } = await supabase
    .from("assessment_attempts")
    .select("id, scores, submitted_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt) notFound();
  if (!attempt.submitted_at) redirect(`/career-discovery/${attemptId}`);

  const scores = attempt.scores as RiasecScores;

  const { data: recommendations } = await supabase
    .from("career_recommendations")
    .select(
      "id, match_score, rank, saved, careers (id, slug, title, industry, summary, typical_majors, entry_roles, key_skills)",
    )
    .eq("attempt_id", attemptId)
    .order("rank");

  const strongest = topDimensions(scores);
  const majors = Array.from(
    new Set(
      (recommendations ?? []).flatMap(
        (r) => (r.careers as unknown as CareerRow)?.typical_majors ?? [],
      ),
    ),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted underline transition-colors duration-200">
        ← Dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-foreground">Your results</h1>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-foreground">Your interest profile</h2>
        <dl className="mt-4 space-y-3">
          {RIASEC_DIMENSIONS.map((dimension) => (
            <div key={dimension} className="flex items-center gap-4">
              <dt className="w-64 shrink-0 text-sm text-muted">
                {DIMENSION_LABELS[dimension]}
              </dt>
              <dd className="flex flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${scores[dimension]}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-foreground">
                  {scores[dimension]}
                </span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          Your strongest areas are{" "}
          <strong>{strongest.map((d) => DIMENSION_LABELS[d].split(" (")[0]).join(", ")}</strong>.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-foreground">Top 3 career matches</h2>
        <ul className="mt-4 space-y-4">
          {(recommendations ?? []).map((recommendation) => {
            const career = recommendation.careers as unknown as CareerRow;
            if (!career) return null;

            return (
              <li key={recommendation.id} className="rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {recommendation.rank}. {career.title}
                    </h3>
                    <p className="text-sm text-muted">{career.industry}</p>
                  </div>
                  <span className="inline-block shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {recommendation.match_score}% match
                  </span>
                </div>

                <p className="mt-3 text-sm text-muted">{career.summary}</p>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Why this result?
                  </summary>
                  <div className="mt-2 space-y-1 text-sm text-muted">
                    <p>
                      Match compares your six scores against this career&apos;s expected profile.
                      A perfect match scores 100.
                    </p>
                    <p>
                      <strong>Entry roles:</strong> {career.entry_roles.join(", ")}
                    </p>
                    <p>
                      <strong>Key skills:</strong> {career.key_skills.join(", ")}
                    </p>
                    <p>
                      <strong>Related majors:</strong> {career.typical_majors.join(", ")}
                    </p>
                  </div>
                </details>

                <div className="mt-4 flex flex-wrap gap-2">
                  <SaveResultButton
                    recommendationId={recommendation.id}
                    initialSaved={recommendation.saved}
                  />
                  <Link
                    href={`/roadmap/new?careerId=${career.id}`}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                  >
                    Continue to AI Roadmap
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {majors.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-foreground">Recommended academic majors</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {majors.map((major) => (
              <li
                key={major}
                className="rounded-full bg-navy-700 px-3 py-1 text-sm text-foreground"
              >
                {major}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 text-sm text-muted">
        These are suggestions to explore, not predictions. Your interests can change, and this
        assessment measures preference rather than ability.
      </p>
    </main>
  );
}
