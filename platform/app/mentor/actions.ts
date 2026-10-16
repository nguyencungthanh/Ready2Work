"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { getGoldenProfile } from "@/lib/content/catalog";

export interface ReviewState { error?: string; success?: string }
export async function recordMentorReviewAction(_previous: ReviewState, formData: FormData): Promise<ReviewState> {
  const mentor = await requireRole("mentor", "admin", "super_admin");
  const parsed = z.object({
    email: z.string().email().transform((email) => email.trim().toLowerCase()),
    positionId: z.string(), score: z.coerce.number().int().min(0).max(100),
    feedback: z.string().trim().min(20).max(4000),
    consent: z.literal("on"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success || !getGoldenProfile(parsed.success ? parsed.data.positionId : "")) return { error: "Vui lòng nhập email, vị trí, điểm 0–100, nhận xét tối thiểu 20 ký tự và xác nhận quyền đánh giá." };
  const admin = createServiceRoleClient();
  const { data: candidate } = await admin.from("profiles").select("id").eq("email", parsed.data.email).eq("account_status", "active").maybeSingle();
  if (!candidate || candidate.id === mentor.id) return { error: "Không tìm thấy ứng viên hợp lệ để đánh giá." };
  const { error } = await admin.from("mentor_reviews").insert({
    candidate_id: candidate.id, mentor_id: mentor.id, position_id: parsed.data.positionId,
    score: parsed.data.score, feedback: parsed.data.feedback,
  });
  if (error) return { error: "Chưa lưu được đánh giá. Vui lòng thử lại." };
  revalidatePath("/mentor"); revalidatePath("/report"); revalidatePath("/dashboard");
  return { success: "Đã lưu đánh giá Mentor vào báo cáo của ứng viên." };
}
