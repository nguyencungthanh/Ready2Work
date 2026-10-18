"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { getGoldenProfile } from "@/lib/content/catalog";
import { analyzeCV } from "@/lib/cv/analyzer";
import { extractCVDocument } from "@/lib/cv/extract";
import type { CVAnalysis } from "@/lib/cv/analyzer";

export interface CVFormState { error?: string; success?: string }
export async function analyzeCVAction(_previous: CVFormState, formData: FormData): Promise<CVFormState> {
  const user = await requireUser();
  const profile = getGoldenProfile(String(formData.get("positionId") ?? ""));
  if (!profile) return { error: "Vui lòng chọn vị trí mục tiêu hợp lệ." };
  if (formData.get("consent") !== "on") return { error: "Vui lòng đồng ý xử lý CV để tiếp tục." };
  const supabase = await createServerSupabaseClient();
  const file = formData.get("cv");
  let path: string | null = null;
  let stage: "read" | "analyze" | "save" = "read";
  try {
    let cvText = String(formData.get("cvText") ?? "").trim();
    let extractionMethod: CVAnalysis["extractionMethod"] = "pasted";
    if (file instanceof File && file.size) {
      const extracted = await extractCVDocument(file);
      cvText = extracted.text;
      extractionMethod = extracted.method;
    }
    if (cvText.length < 40 || cvText.length > 40_000) return { error: "Nội dung CV cần từ 40 đến 40.000 ký tự." };
    stage = "analyze";
    const result = { ...await analyzeCV(cvText, profile), extractionMethod };
    stage = "save";
    if (file instanceof File && file.size) {
      path = `${user.id}/${crypto.randomUUID()}/cv.pdf`;
      const { error } = await supabase.storage.from("candidate-cvs").upload(path, file, { upsert: false, contentType: "application/pdf" });
      if (error) throw new Error("Không lưu được tệp CV. Vui lòng thử lại.");
    }
    const admin = createServiceRoleClient();
    const { error } = await admin.from("cv_analyses").insert({
      user_id: user.id, position_id: profile.position_id, position_title: profile.position_name,
      file_path: path, file_name: file instanceof File && file.size ? file.name.slice(0, 200) : null,
      result,
    });
    if (error) throw new Error("Không lưu được kết quả. Vui lòng kiểm tra migration và thử lại.");
    revalidatePath("/roadmap/cv");
    revalidatePath("/dashboard");
    revalidatePath("/report");
    return { success: "Đã lưu phân tích vào tài khoản của bạn." };
  } catch (error) {
    if (path) await supabase.storage.from("candidate-cvs").remove([path]);
    if (stage === "analyze" && typeof error === "object" && error !== null && "status" in error && error.status === 429) {
      return { error: "Đã đọc được CV nhưng dịch vụ AI đang đạt giới hạn lượt gọi. Vui lòng thử lại sau; chưa có kết quả mới được lưu." };
    }
    // Parser errors are safe to present; do not expose database/provider internals.
    const message = error instanceof Error ? error.message : "";
    return { error: /^(Tệp|CV |Chỉ hỗ trợ|Không đọc|Nội dung CV|Không lưu)/.test(message)
      ? message : stage === "analyze"
        ? "Đã đọc được CV nhưng AI chưa hoàn tất phân tích. Vui lòng thử lại sau; chưa có kết quả mới được lưu."
        : "Chưa xử lý được CV. Vui lòng thử lại hoặc dán nội dung văn bản." };
  }
}
