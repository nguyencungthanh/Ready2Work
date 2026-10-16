import { AppShell } from "@/components/app-shell";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { completeInterviewSessionAction } from "../../actions";
import { AnswerForm } from "./answer-form";

export const dynamic = "force-dynamic";

/**
 * One question at a time (Feature 4 user flow step 3-4: "Answer by Text").
 * Shows the first unanswered question; once all are answered, shows a
 * Finish button that scores the session (evaluateInterviewAnswer already
 * ran per-answer, so completing just averages the stored scores).
 */
export default async function InterviewSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id, set_id, completed_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== user.id) notFound();
  if (session.completed_at) {
    redirect(`/interviews/sessions/${sessionId}/feedback`);
  }

  const [{ data: questions }, { data: answered }] = await Promise.all([
    supabase
      .from("interview_questions")
      .select("id, position, prompt, round_number")
      .eq("set_id", session.set_id)
      .order("round_number").order("position"),
    supabase.from("interview_answers").select("question_id").eq("session_id", sessionId),
  ]);

  const answeredIds = new Set((answered ?? []).map((a) => a.question_id));
  const next = (questions ?? []).find((q) => !answeredIds.has(q.id));
  const total = questions?.length ?? 0;

  if (!next) {
    return (
      <AppShell active="interviews" displayName={user.displayName}><main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-xl font-bold text-foreground">All questions answered</h1>
        <p className="mt-2 text-sm text-muted">
          You have answered all {total} questions. Finish the session to see your feedback.
        </p>
        <form action={completeInterviewSessionAction} className="mt-6">
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
          >
            Finish and see feedback
          </button>
        </form>
      </main></AppShell>
    );
  }

  const currentIndex = (questions ?? []).findIndex((q) => q.id === next.id);

  return (
    <AppShell active="interviews" displayName={user.displayName}><main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-7 grid grid-cols-3 gap-2">{[1, 2, 3].map((round) => <div key={round} className={`rounded-xl border p-3 text-center text-sm font-semibold ${round === next.round_number ? "border-primary bg-primary/10 text-primary" : "border-border text-muted"}`}>Vòng {round}<span className="mt-1 block text-xs font-normal">{round === 1 ? "Tổng quan" : round === 2 ? "Chuyên môn" : "Tình huống"}</span></div>)}</div>
      <p className="text-sm text-muted">
        Question {currentIndex + 1} of {total}
      </p>
      <h1 className="mt-2 text-xl font-bold text-foreground">{next.prompt}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">Trả lời bằng trải nghiệm và lập luận của bạn. Với câu hỏi tình huống, trình bày bối cảnh, hành động và kết quả cụ thể.</p>

      <AnswerForm key={next.id} sessionId={sessionId} questionId={next.id} />
    </main></AppShell>
  );
}
