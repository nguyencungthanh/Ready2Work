"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { evaluateInterviewWithAI, type InterviewRubricCriterion } from "@/lib/interview/ai-evaluator";
import { summarizeInterview } from "@/lib/interview/progress";
import { logger } from "@/lib/observability/logger";
import { isSourceInterview, isPublishedBusinessContent } from "@/lib/content/source-catalog";
import { PRACTICE_SECONDS, practiceDeadline, practiceExpired } from "@/lib/practice-time";

export interface InterviewAnswerState { error?: string }

export async function startInterviewSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const setId = String(formData.get("setId") ?? "");
  if (!setId) throw new Error("Hãy chọn bộ câu hỏi phỏng vấn.");
  const supabase = await createServerSupabaseClient();
  const [{ data: set }, { data: questions }] = await Promise.all([
    supabase.from("interview_sets").select("id, slug, is_available").eq("id", setId).maybeSingle(),
    supabase.from("interview_questions").select("round_number").eq("set_id", setId),
  ]);
  if (!set?.is_available || !(isSourceInterview(set) || isPublishedBusinessContent(set)) || new Set((questions ?? []).map((q) => q.round_number)).size !== 3) {
    throw new Error("Bộ phỏng vấn này đang chờ bổ sung đầy đủ ba vòng câu hỏi nguồn.");
  }
  const { data: existing } = await supabase.from("interview_sessions").select("id")
    .eq("user_id", user.id).eq("set_id", setId).is("completed_at", null)
    .gt("created_at", new Date(Date.now() - PRACTICE_SECONDS * 1000).toISOString())
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) redirect(`/interviews/sessions/${existing.id}`);
  const { data: session, error } = await supabase.from("interview_sessions")
    .insert({ user_id: user.id, set_id: setId }).select("id").single();
  if (error || !session) throw new Error("Chưa bắt đầu được buổi phỏng vấn. Vui lòng thử lại.");
  redirect(`/interviews/sessions/${session.id}`);
}

export async function submitInterviewAnswerAction(
  _previous: InterviewAnswerState,
  formData: FormData,
): Promise<InterviewAnswerState> {
  const user = await requireUser();
  const submittedAt = new Date();
  const sessionId = String(formData.get("sessionId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const answerText = String(formData.get("answerText") ?? "").trim();
  if (!sessionId || !questionId || !answerText) return { error: "Hãy nhập câu trả lời trước khi tiếp tục." };
  if (answerText.length > 20_000) return { error: "Câu trả lời tối đa 20.000 ký tự." };
  const supabase = await createServerSupabaseClient();
  const { data: session } = await supabase.from("interview_sessions")
    .select("id, user_id, set_id, created_at, completed_at, interview_sets(slug, is_available)").eq("id", sessionId).maybeSingle();
  if (!session || session.user_id !== user.id || session.completed_at) {
    return { error: "Buổi phỏng vấn không khả dụng hoặc đã hoàn thành." };
  }
  if (practiceExpired(session.created_at, submittedAt.getTime())) return { error: "Đã hết 60 phút. Buổi phỏng vấn đã dừng; không nhận thêm câu trả lời." };
  const sourceSet = session.interview_sets as unknown as { slug: string; is_available: boolean } | { slug: string; is_available: boolean }[] | null;
  const set = Array.isArray(sourceSet) ? sourceSet[0] : sourceSet;
  if (!set?.is_available || !(isSourceInterview(set) || isPublishedBusinessContent(set))) return { error: "Bộ câu hỏi này đã được lưu trữ hoặc đang chờ xác nhận tiêu chí. Hãy chọn bộ câu hỏi hiện tại để luyện tập." };
  const [{ data: questions }, { data: answers }] = await Promise.all([
    createServiceRoleClient().from("interview_questions").select("id, prompt, guidance, reference_answer, keywords, rubric, grading_rubric, round_number, position")
      .eq("set_id", session.set_id).order("round_number").order("position"),
    supabase.from("interview_answers").select("question_id").eq("session_id", sessionId),
  ]);
  const answeredIds = new Set((answers ?? []).map((answer) => answer.question_id));
  const question = (questions ?? []).find((row) => !answeredIds.has(row.id));
  if (!question || question.id !== questionId) return { error: "Hãy tiếp tục với câu hỏi chưa trả lời tiếp theo trong buổi phỏng vấn." };
  const rubric = (question.grading_rubric ?? []) as InterviewRubricCriterion[];
  if (!rubric.length) return { error: "Câu hỏi chưa có đầy đủ tiêu chí chấm từ nguồn. Nội dung trả lời vẫn được giữ; chưa có điểm mới được lưu." };
  let result;
  try {
    result = await evaluateInterviewWithAI(answerText, question.prompt, [question.guidance, question.reference_answer].filter(Boolean).join("\n\n"), rubric);
  } catch (error) {
    logger.error("interview_evaluation_failed", { operation: "submitInterviewAnswerAction", domain: "interviews", error_code: error instanceof Error ? error.name : "UNKNOWN" });
    return { error: "AI chưa đánh giá được câu trả lời lúc này. Nội dung vẫn được giữ; vui lòng thử lại." };
  }
  // Grades are server-only writes. Ownership and set membership were verified above.
  const { error } = await createServiceRoleClient().from("interview_answers").insert({
    session_id: sessionId, question_id: questionId, answer_text: answerText, submitted_at: submittedAt.toISOString(),
    score: result.score, criteria: result.criteria,
  });
  if (error) return { error: "Chưa lưu được câu trả lời. Hãy tải lại để kiểm tra trước khi nộp lại." };
  revalidatePath(`/interviews/sessions/${sessionId}`);
  revalidatePath("/dashboard");
  return {};
}

export async function completeInterviewSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: session } = await supabase.from("interview_sessions")
    .select("id, user_id, set_id, created_at, completed_at, interview_sets(is_available)").eq("id", sessionId).maybeSingle();
  if (!session || session.user_id !== user.id) throw new Error("Không tìm thấy buổi phỏng vấn.");
  if (session.completed_at) redirect(`/interviews/sessions/${sessionId}/feedback`);
  const [{ data: questions }, { data: answers }] = await Promise.all([
    supabase.from("interview_questions").select("id, round_number, max_score").eq("set_id", session.set_id),
    supabase.from("interview_answers").select("question_id, score").eq("session_id", sessionId),
  ]);
  const summary = summarizeInterview(questions ?? [], answers ?? []);
  if (!summary.hasThreeRounds) throw new Error("Cần có đầy đủ câu hỏi và hoàn thành cả ba vòng phỏng vấn.");
  const { error } = await createServiceRoleClient().from("interview_sessions")
    .update({ overall_score: summary.overallScore, round_scores: summary.roundScores, completed_at: new Date(Math.min(Date.now(), practiceDeadline(session.created_at))).toISOString() })
    .eq("id", sessionId).eq("user_id", user.id).is("completed_at", null);
  if (error) throw new Error("Chưa hoàn tất được buổi phỏng vấn. Vui lòng thử lại.");
  revalidatePath("/dashboard");
  revalidatePath("/report");
  redirect(`/interviews/sessions/${sessionId}/feedback`);
}

/** RLS and the explicit owner filter both scope deletion to this account. */
export async function deleteInterviewSessionAction(_previous: InterviewAnswerState, formData: FormData): Promise<InterviewAnswerState> {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return { error: "Hãy chọn buổi phỏng vấn cần xóa." };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("interview_sessions").delete().eq("id", sessionId).eq("user_id", user.id).select("id");
  if (error || !data?.length) return { error: "Không xóa được buổi phỏng vấn. Vui lòng tải lại và thử lại." };
  revalidatePath("/interviews");
  revalidatePath(`/interviews/sessions/${sessionId}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/report");
  return {};
}
