"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { getGoldenProfile } from "@/lib/content/catalog";
import { analyzeCV } from "@/lib/cv/analyzer";
import { extractCVText } from "@/lib/cv/extract";

export interface CVFormState { error?: string; success?: string }
export async function analyzeCVAction(_previous: CVFormState, formData: FormData): Promise<CVFormState> {
  const user = await requireUser();
  const profile = getGoldenProfile(String(formData.get("positionId") ?? ""));
  if (!profile) return { error: "Vui lòng chọn vị trí mục tiêu hợp lệ." };
  if (formData.get("consent") !== "on") return { error: "Vui lòng đồng ý xử lý CV để tiếp tục." };
  const supabase = await createServerSupabaseClient();
  const file = formData.get("cv");
  let path: string | null = null;
  try {
    let cvText = String(formData.get("cvText") ?? "").trim();
    if (file instanceof File && file.size) cvText = await extractCVText(file);
    if (cvText.length < 40 || cvText.length > 40_000) return { error: "Nội dung CV cần từ 40 đến 40.000 ký tự." };
    const result = await analyzeCV(cvText, profile);
    if (file instanceof File && file.size) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      path = `${user.id}/${crypto.randomUUID()}/cv.${extension}`;
      const { error } = await supabase.storage.from("candidate-cvs").upload(path, file, { upsert: false });
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
    // Parser errors are safe to present; do not expose database/provider internals.
    const message = error instanceof Error ? error.message : "";
    return { error: /^(Tệp|CV |Chỉ hỗ trợ|Không đọc|Nội dung CV|Không lưu)/.test(message)
      ? message : "Chưa phân tích được CV. Vui lòng thử lại hoặc dán nội dung văn bản." };
  }
}
