"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { revalidatePath } from "next/cache";
import { evaluateSubmissionWithAI, type RubricCriterion } from "@/lib/simulation/ai-evaluator";
import { logger } from "@/lib/observability/logger";
import { readSubmissionDocument } from "@/lib/simulation/read-submission";

export interface FormState {
  error?: string;
}

export async function readSimulationUploadAction(formData: FormData): Promise<{ text?: string; error?: string }> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Hãy chọn tài liệu bài làm." };
  try { return { text: await readSubmissionDocument(file) }; }
  catch (error) { return { error: error instanceof Error && /^(Tệp|Tài liệu|PDF|Chỉ hỗ trợ|Nội dung tệp)/.test(error.message) ? error.message : "Chưa đọc được tài liệu. Hãy kiểm tra tệp hoặc dán nội dung bài làm." }; }
}

/** Starts or resumes an owner-scoped attempt; the database supplies its timestamp. */
export async function startSimulationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const simulationId = String(formData.get("simulationId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: simulation } = await supabase.from("simulations").select("id, slug, is_available").eq("id", simulationId).maybeSingle();
  if (!simulation?.is_available) throw new Error("Bài mô phỏng này chưa sẵn sàng.");
  const { data: existing } = await supabase.from("simulation_attempts").select("id")
    .eq("user_id", user.id).eq("simulation_id", simulationId).is("submitted_at", null).is("superseded_at", null)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) redirect(`/simulations/${simulation.slug}?attempt=${existing.id}`);
  const { data: attempt, error } = await supabase.from("simulation_attempts")
    .insert({ user_id: user.id, simulation_id: simulationId }).select("id").single();
  if (error || !attempt) throw new Error("Chưa bắt đầu được bài mô phỏng. Vui lòng thử lại.");
  redirect(`/simulations/${simulation.slug}?attempt=${attempt.id}`);
}

/** Validate ownership, score with objective time, and persist the result atomically. */
export async function submitSimulationAction(
  simulationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim();
  const attemptId = String(formData.get("attemptId") ?? "");
  const submittedAt = new Date();

  if (content.length === 0) {
    return { error: "Hãy nhập nội dung bài làm trước khi nộp." };
  }
  if (content.length > 50_000) return { error: "Bài làm tối đa 50.000 ký tự." };

  const supabase = await createServerSupabaseClient();
  const { data: attempt } = await supabase.from("simulation_attempts")
    .select("id, user_id, simulation_id, started_at, submitted_at, submission_id, superseded_at")
    .eq("id", attemptId).eq("user_id", user.id).maybeSingle();
  if (!attempt || attempt.simulation_id !== simulationId) return { error: "Hãy bắt đầu lượt làm bài của bạn trước khi nộp." };
  if (attempt.submission_id) redirect(`/simulations/submissions/${attempt.submission_id}`);
  if (attempt.superseded_at) return { error: "Đề bài đã được cập nhật theo tài liệu mới. Bản nháp cũ vẫn được giữ; hãy bắt đầu lượt mới để làm và chấm theo đề hiện tại." };
  const actualDurationSeconds = Math.floor((submittedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000);
  if (actualDurationSeconds < 0 || !Number.isFinite(actualDurationSeconds)) return { error: "Chưa xác minh được thời gian làm bài. Vui lòng tải lại trang." };
  // Verify public availability before reading the private grading rubric.
  const { data: available } = await supabase.from("simulations").select("id, is_available").eq("id", simulationId).maybeSingle();
  if (!available?.is_available) return { error: "Bài mô phỏng này hiện chưa sẵn sàng." };

  const { data: simulation } = await createServiceRoleClient()
    .from("simulations")
    .select("brief, task_instructions, rubric, grading_rubric, reference_data, min_words")
    .eq("id", simulationId)
    .maybeSingle();

  if (!simulation) {
    return { error: "Không tìm thấy bài mô phỏng." };
  }

  const rubric = (simulation.grading_rubric ?? simulation.rubric ?? []) as RubricCriterion[];

  let result;
  try {
    result = await evaluateSubmissionWithAI(
      content,
      simulation.brief,
      simulation.task_instructions,
      rubric,
      simulation.min_words,
      { referenceData: simulation.reference_data, actualDurationSeconds },
    );
  } catch (err) {
    logger.error("simulation_evaluation_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: err instanceof Error ? err.name : "UNKNOWN",
    });
    return { error: "AI chưa chấm được bài làm lúc này. Nội dung vẫn được giữ; vui lòng thử lại." };
  }

  const { data: submission, error } = await createServiceRoleClient().rpc("finalize_simulation_attempt", {
    p_attempt_id: attempt.id,
    p_user_id: user.id,
    p_content: content,
    p_overall_score: result.overallScore,
    p_overall_band: result.overallBand,
    p_criterion_scores: { summary: result.summary, criteria: result.criteria },
    p_private_details: result.privateDetails ?? {},
    p_submitted_at: submittedAt.toISOString(),
  });

  if (error || !submission) {
    logger.error("simulation_submit_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: error?.code ?? "UNKNOWN",
    });
    return { error: "Chưa lưu được bài làm. Vui lòng thử lại." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/report");
  redirect(`/simulations/submissions/${submission}`);
}
