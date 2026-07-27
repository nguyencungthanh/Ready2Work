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

  const { data: questions } = await supabase
    .from("interview_questions")
    .select("id, position, prompt, guidance")
    .eq("set_id", session.set_id)
    .order("position");

  const { data: answered } = await supabase
    .from("interview_answers")
    .select("question_id")
    .eq("session_id", sessionId);

  const answeredIds = new Set((answered ?? []).map((a) => a.question_id));
  const next = (questions ?? []).find((q) => !answeredIds.has(q.id));
  const total = questions?.length ?? 0;

  if (!next) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-xl font-semibold text-gray-900">All questions answered</h1>
        <p className="mt-2 text-sm text-gray-600">
          You have answered all {total} questions. Finish the session to see your feedback.
        </p>
        <form action={completeInterviewSessionAction} className="mt-6">
          <input type="hidden" name="sessionId" value={sessionId} />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Finish and see feedback
          </button>
        </form>
      </div>
    );
  }

  const currentIndex = (questions ?? []).findIndex((q) => q.id === next.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-gray-500">
        Question {currentIndex + 1} of {total}
      </p>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">{next.prompt}</h1>
      {next.guidance && <p className="mt-2 text-sm text-gray-600">{next.guidance}</p>}

      <AnswerForm sessionId={sessionId} questionId={next.id} />
    </div>
  );
}
