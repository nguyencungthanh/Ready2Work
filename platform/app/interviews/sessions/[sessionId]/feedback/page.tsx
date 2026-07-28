import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface AnswerCriterion {
  label: string;
  score: number;
  maxScore: number;
  note: string;
}

export default async function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id, overall_score, completed_at, set_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== user.id || !session.completed_at) {
    notFound();
  }

  const [{ data: interviewSet }, { data: answers }, { data: questions }] = await Promise.all([
    supabase
      .from("interview_sets")
      .select("position_title, company_name, industry")
      .eq("id", session.set_id)
      .maybeSingle(),
    supabase
      .from("interview_answers")
      .select("answer_text, score, criteria, question_id")
      .eq("session_id", sessionId),
    supabase
      .from("interview_questions")
      .select("id, position, prompt")
      .eq("set_id", session.set_id)
      .order("position"),
  ]);

  const promptById = new Map((questions ?? []).map((q) => [q.id, q]));

  const rows = (answers ?? [])
    .map((a) => ({
      ...a,
      question: promptById.get(a.question_id),
    }))
    .sort((a, b) => (a.question?.position ?? 0) - (b.question?.position ?? 0));

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Interview feedback
      </p>
      <h1 className="mt-1 text-2xl font-bold text-foreground">
        {interviewSet?.position_title}
        {interviewSet?.company_name ? ` at ${interviewSet.company_name}` : ""}
      </h1>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">Overall score</p>
        <p className="mt-1 text-4xl font-semibold text-foreground">{session.overall_score}/100</p>
        <p className="mt-3 text-xs text-muted">
          This is an AI-assisted learning evaluation, not a hiring decision. Scoring uses your
          written answer content only — accent, voice, and delivery are never scored.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {rows.map((row, index) => (
          <div key={row.question_id} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-foreground">
              Question {index + 1}: {row.question?.prompt}
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-surface p-3 text-sm text-muted">
              {row.answer_text}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">Score: {row.score}/100</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {((row.criteria as AnswerCriterion[] | null) ?? []).map((criterion) => (
                <li key={criterion.label}>
                  <span className="font-medium text-foreground">{criterion.label}:</span>{" "}
                  {criterion.score}/{criterion.maxScore} — {criterion.note}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Link href="/interviews" className="text-sm font-medium text-primary underline transition-colors duration-200">
          Practice another set
        </Link>
        <Link href="/dashboard" className="text-sm font-medium text-primary underline transition-colors duration-200">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
