"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { evaluateInterviewAnswer } from "@/lib/interview/evaluator";
import { evaluateInterviewWithAI, type InterviewRubricCriterion } from "@/lib/interview/ai-evaluator";
import { summarizeInterview } from "@/lib/interview/progress";
import { logger } from "@/lib/observability/logger";

export interface InterviewAnswerState { error?: string }

export async function startInterviewSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const setId = String(formData.get("setId") ?? "");
  if (!setId) throw new Error("Choose an interview first.");
  const supabase = await createServerSupabaseClient();
  const [{ data: set }, { data: questions }] = await Promise.all([
    supabase.from("interview_sets").select("id, is_available").eq("id", setId).maybeSingle(),
    supabase.from("interview_questions").select("round_number").eq("set_id", setId),
  ]);
  if (!set?.is_available || new Set((questions ?? []).map((q) => q.round_number)).size !== 3) {
    throw new Error("This interview is awaiting all three rounds of source questions.");
  }
  const { data: existing } = await supabase.from("interview_sessions").select("id")
    .eq("user_id", user.id).eq("set_id", setId).is("completed_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) redirect(`/interviews/sessions/${existing.id}`);
  const { data: session, error } = await supabase.from("interview_sessions")
    .insert({ user_id: user.id, set_id: setId }).select("id").single();
  if (error || !session) throw new Error("Could not start the interview. Please try again.");
  redirect(`/interviews/sessions/${session.id}`);
}

export async function submitInterviewAnswerAction(
  _previous: InterviewAnswerState,
  formData: FormData,
): Promise<InterviewAnswerState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const answerText = String(formData.get("answerText") ?? "").trim();
  if (!sessionId || !questionId || !answerText) return { error: "Write an answer before continuing." };
  if (answerText.length > 20_000) return { error: "Keep your answer under 20,000 characters." };
  const supabase = await createServerSupabaseClient();
  const { data: session } = await supabase.from("interview_sessions")
    .select("id, user_id, set_id, completed_at").eq("id", sessionId).maybeSingle();
  if (!session || session.user_id !== user.id || session.completed_at) {
    return { error: "This interview is unavailable or already complete." };
  }
  const [{ data: questions }, { data: answers }] = await Promise.all([
    createServiceRoleClient().from("interview_questions").select("id, prompt, guidance, reference_answer, keywords, rubric, grading_rubric, round_number, position")
      .eq("set_id", session.set_id).order("round_number").order("position"),
    supabase.from("interview_answers").select("question_id").eq("session_id", sessionId),
  ]);
  const answeredIds = new Set((answers ?? []).map((answer) => answer.question_id));
  const question = (questions ?? []).find((row) => !answeredIds.has(row.id));
  if (!question || question.id !== questionId) return { error: "Continue with the next unanswered question in this interview." };
  const rubric = (question.grading_rubric ?? question.rubric ?? []) as InterviewRubricCriterion[];
  let result;
  try {
    // Legacy sets without a supplied rubric retain their explicitly identified rules-based evaluation.
    result = rubric.length
      ? await evaluateInterviewWithAI(answerText, question.prompt, question.reference_answer || question.guidance, rubric)
      : evaluateInterviewAnswer(answerText, question.keywords ?? []);
  } catch (error) {
    logger.error("interview_evaluation_failed", { operation: "submitInterviewAnswerAction", domain: "interviews", error_code: error instanceof Error ? error.message : "UNKNOWN" });
    return { error: "Your answer could not be evaluated right now. Your text is still here; please try again." };
  }
  // Grades are server-only writes. Ownership and set membership were verified above.
  const { error } = await createServiceRoleClient().from("interview_answers").insert({
    session_id: sessionId, question_id: questionId, answer_text: answerText,
    score: result.score, criteria: result.criteria,
  });
  if (error) return { error: "Could not save this answer. Refresh to check whether it was already saved." };
  revalidatePath(`/interviews/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function completeInterviewSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: session } = await supabase.from("interview_sessions")
    .select("id, user_id, set_id, completed_at").eq("id", sessionId).maybeSingle();
  if (!session || session.user_id !== user.id) throw new Error("Session not found.");
  if (session.completed_at) redirect(`/interviews/sessions/${sessionId}/feedback`);
  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from("interview_questions").select("id, round_number, max_score").eq("set_id", session.set_id),
    supabase.from("interview_answers").select("question_id, score").eq("session_id", sessionId),
  ]);
  const summary = summarizeInterview(questions ?? [], answers ?? []);
  if (!summary.hasThreeRounds) throw new Error("All three interview rounds must be configured and completed.");
  const { error } = await createServiceRoleClient().from("interview_sessions")
    .update({ overall_score: summary.overallScore, round_scores: summary.roundScores, completed_at: new Date().toISOString() })
    .eq("id", sessionId).eq("user_id", user.id).is("completed_at", null);
  if (error) throw new Error("Could not complete the session. Please try again.");
  revalidatePath("/dashboard");
  revalidatePath("/report");
  redirect(`/interviews/sessions/${sessionId}/feedback`);
}
