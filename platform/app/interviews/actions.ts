"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluateInterviewAnswer } from "@/lib/interview/evaluator";
import { logger } from "@/lib/observability/logger";

/** Starts a new interview practice session for the given set (Feature 4). */
export async function startInterviewSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const setId = String(formData.get("setId") ?? "");
  if (!setId) return;

  const supabase = await createServerSupabaseClient();

  const { data: session, error } = await supabase
    .from("interview_sessions")
    .insert({ user_id: user.id, set_id: setId })
    .select("id")
    .single();

  if (error || !session) {
    logger.error("interview_session_start_failed", {
      operation: "startInterviewSessionAction",
      domain: "interviews",
      error_code: error?.code ?? "UNKNOWN",
    });
    throw new Error("Could not start the interview session. Please try again.");
  }

  redirect(`/interviews/sessions/${session.id}`);
}

/**
 * Scores one answer using content only - no accent, voice, or gender signal
 * ever reaches this function (feature spec section 4, "AI Fairness").
 */
export async function submitInterviewAnswerAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const answerText = String(formData.get("answerText") ?? "").trim();

  if (!sessionId || !questionId || answerText.length < 1) {
    return;
  }

  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== user.id) {
    return;
  }

  const { data: question } = await supabase
    .from("interview_questions")
    .select("id, keywords")
    .eq("id", questionId)
    .maybeSingle();
  if (!question) {
    return;
  }

  const result = evaluateInterviewAnswer(answerText, question.keywords ?? []);

  const { error } = await supabase.from("interview_answers").upsert(
    {
      session_id: sessionId,
      question_id: questionId,
      answer_text: answerText,
      score: result.score,
      criteria: result.criteria,
    },
    { onConflict: "session_id,question_id" },
  );

  if (error) {
    logger.error("interview_answer_save_failed", {
      operation: "submitInterviewAnswerAction",
      domain: "interviews",
      error_code: error.code,
    });
  }

  // No redirect here: this action is bound directly to the page's own
  // <form>, so Next.js re-renders the current route after the action
  // completes. Redirecting to the same URL instead of relying on that
  // rerender risks serving a stale Router Cache entry that still shows the
  // answer as unsaved.
  revalidatePath(`/interviews/sessions/${sessionId}`);
}

/** Marks the session complete once every question has an answer. */
export async function completeInterviewSessionAction(formData: FormData): Promise<void> {
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id, set_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.user_id !== user.id) {
    throw new Error("Session not found.");
  }

  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from("interview_questions").select("id").eq("set_id", session.set_id),
    supabase.from("interview_answers").select("score").eq("session_id", sessionId),
  ]);

  if (!questions || !answers || answers.length !== questions.length) {
    throw new Error("Answer every question before finishing.");
  }

  const overallScore = Math.round(
    answers.reduce((sum, a) => sum + (a.score ?? 0), 0) / answers.length,
  );

  const { error } = await supabase
    .from("interview_sessions")
    .update({ overall_score: overallScore, completed_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    throw new Error("Could not complete the session.");
  }

  redirect(`/interviews/sessions/${sessionId}/feedback`);
}
