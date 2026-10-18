"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { getGoldenProfile } from "@/lib/content/catalog";
import { analyzeCV } from "@/lib/cv/analyzer";
import { extractCVDocument } from "@/lib/cv/extract";
import type { CVAnalysis } from "@/lib/cv/analyzer";
import { cvErrorDetails } from "@/lib/cv/errors";
import { hashUserId, logger } from "@/lib/observability/logger";

export interface CVFormState { error?: string; success?: string }
export async function analyzeCVAction(_previous: CVFormState, formData: FormData): Promise<CVFormState> {
  const user = await requireUser();
  const profile = getGoldenProfile(String(formData.get("positionId") ?? ""));
  if (!profile) return { error: "Vui lòng chọn vị trí mục tiêu hợp lệ." };
  if (formData.get("consent") !== "on") return { error: "Vui lòng đồng ý xử lý CV để tiếp tục." };
  const supabase = await createServerSupabaseClient();
  const file = formData.get("cv");
  let path: string | null = null;
  let stage: "read" | "analyze" | "upload" | "save" = "read";
  const requestId = crypto.randomUUID();
  const started = Date.now();
  let stageStarted = started;
  const recordStage = () => {
    logger.info("cv_stage_completed", { request_id: requestId, route: "/roadmap/cv", operation: stage, duration_ms: Date.now() - stageStarted });
    stageStarted = Date.now();
  };
  try {
    let cvText = String(formData.get("cvText") ?? "").trim();
    let extractionMethod: CVAnalysis["extractionMethod"] = "pasted";
    if (file instanceof File && file.size) {
      const extracted = await extractCVDocument(file);
      cvText = extracted.text;
      extractionMethod = extracted.method;
    }
    if (cvText.length < 40 || cvText.length > 40_000) return { error: "Nội dung CV cần từ 40 đến 40.000 ký tự." };
    recordStage();
    stage = "analyze";
    const result = { ...await analyzeCV(cvText, profile), extractionMethod };
    recordStage();
    stage = "upload";
    if (file instanceof File && file.size) {
      path = `${user.id}/${crypto.randomUUID()}/cv.pdf`;
      const { error } = await supabase.storage.from("candidate-cvs").upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (error) throw new Error("Không lưu được tệp CV. Vui lòng thử lại.");
    }
    recordStage();
    stage = "save";
    const admin = createServiceRoleClient();
    const { error } = await admin.from("cv_analyses").insert({
      user_id: user.id, position_id: profile.position_id, position_title: profile.position_name,
      file_path: path, file_name: file instanceof File && file.size ? file.name.slice(0, 200) : null,
      result,
    });
    if (error) throw new Error("Không lưu được kết quả. Vui lòng kiểm tra migration và thử lại.");
    recordStage();
    revalidatePath("/roadmap/cv");
    revalidatePath("/dashboard");
    revalidatePath("/report");
    return { success: "Đã lưu phân tích vào tài khoản của bạn." };
  } catch (error) {
    const details = cvErrorDetails(error);
    logger.error("cv_processing_failed", {
      request_id: requestId, user_id_hash: hashUserId(user.id), route: "/roadmap/cv", operation: stage,
      duration_ms: Date.now() - started, ...details,
      error_code: (stage === "analyze" || details.error_code === "CV_AI_AUTH") ? details.error_code : `CV_${stage.toUpperCase()}_FAILED`,
    });
    if (path) {
      try {
        const { error: cleanupError } = await supabase.storage.from("candidate-cvs").remove([path]);
        if (cleanupError) throw cleanupError;
      } catch {
        logger.error("cv_cleanup_failed", { request_id: requestId, route: "/roadmap/cv", operation: "cleanup", error_code: "CV_CLEANUP_FAILED" });
      }
    }
    if (details.error_code === "CV_AI_AUTH") return { error: "Dịch vụ AI chưa xác thực được kết nối. Vui lòng liên hệ quản trị viên kiểm tra cấu hình AI; chưa có kết quả mới được lưu." };
    if (stage === "analyze") {
      const messages: Record<string, string> = {
        CV_AI_QUOTA: "Đã đọc được CV nhưng dịch vụ AI đang đạt giới hạn lượt gọi. Vui lòng thử lại sau; chưa có kết quả mới được lưu.",
        CV_AI_UNAVAILABLE: "Đã đọc được CV nhưng dịch vụ AI đang tạm thời quá tải. Vui lòng thử lại sau; chưa có kết quả mới được lưu.",
        CV_AI_TIMEOUT: "Đã đọc được CV nhưng dịch vụ AI phản hồi quá lâu. Vui lòng thử lại; chưa có kết quả mới được lưu.",
        CV_INVALID_RESPONSE: "Đã đọc được CV nhưng kết quả AI trả về chưa đúng định dạng sau khi thử lại. Vui lòng thử phân tích lại; chưa có kết quả mới được lưu.",
        CV_INCOMPLETE_ANALYSIS: "Đã đọc được CV nhưng AI chưa đối chiếu đủ yêu cầu sau khi thử lại. Vui lòng thử phân tích lại; chưa có kết quả mới được lưu.",
        CV_INVALID_EVIDENCE: "Đã đọc được CV nhưng AI chưa chọn được bằng chứng hợp lệ sau khi thử lại. Vui lòng thử phân tích lại; chưa có kết quả mới được lưu.",
      };
      return { error: messages[details.error_code] ?? "Đã đọc được CV nhưng AI chưa hoàn tất phân tích. Vui lòng thử lại sau; chưa có kết quả mới được lưu." };
    }
    // Parser errors are safe to present; do not expose database/provider internals.
    const message = error instanceof Error ? error.message : "";
    return { error: /^(Tệp|CV |Chỉ hỗ trợ|Không đọc|Nội dung CV|Không lưu)/.test(message)
      ? message : "Chưa xử lý được CV. Vui lòng thử lại hoặc dán nội dung văn bản." };
  }
}
