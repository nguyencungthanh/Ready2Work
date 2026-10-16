import { requireRole } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { publicPositionCatalog } from "@/lib/content/catalog";
import { AppShell } from "@/components/app-shell";
import { MentorReviewForm } from "./review-form";
export const metadata = { title: "Đánh giá Mentor · Ready2Work" };
export default async function MentorPage() {
  const mentor = await requireRole("mentor", "admin", "super_admin");
  const client = await createServerSupabaseClient();
  const { data, error } = await client.from("mentor_reviews").select("id, position_id, score, feedback, created_at").eq("mentor_id", mentor.id).order("created_at", { ascending: false }).limit(20);
  return <AppShell displayName={mentor.displayName}><main className="mx-auto max-w-3xl px-6 py-10"><p className="text-sm font-semibold text-primary">Không gian Mentor</p><h1 className="mt-2 text-3xl font-bold">Ghi nhận năng lực qua đánh giá thực tế</h1><p className="mb-8 mt-3 text-sm leading-6 text-muted">Điểm do Mentor đã được xác minh ghi nhận đóng góp 30% điểm sẵn sàng ứng tuyển, theo đúng vị trí mục tiêu của ứng viên.</p><MentorReviewForm positions={publicPositionCatalog()} /><section className="mt-10"><h2 className="text-xl font-bold">Đánh giá gần đây của bạn</h2>{error && <p role="alert" className="mt-4 text-sm text-amber-800">Chưa tải được lịch sử đánh giá.</p>}<ul className="mt-4 space-y-4">{data?.map((review) => <li key={review.id} className="rounded-xl border border-border bg-white p-5"><p className="font-semibold">{review.position_id} · {review.score}/100</p><p className="mt-2 whitespace-pre-line text-sm text-muted">{review.feedback}</p><p className="mt-3 text-xs text-muted">{new Date(review.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></li>)}</ul></section></main></AppShell>;
}
