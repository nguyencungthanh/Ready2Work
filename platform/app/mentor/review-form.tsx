"use client";
import { useActionState } from "react";
import { recordMentorReviewAction } from "./actions";
export function MentorReviewForm({ positions }: { positions: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState(recordMentorReviewAction, {});
  const cls = "mt-2 block w-full rounded-lg border border-border bg-white p-3 font-normal";
  return <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-6">
    <label className="block text-sm font-semibold">Email ứng viên<input type="email" name="email" required className={cls} /></label>
    <label className="block text-sm font-semibold">Vị trí đánh giá<select name="positionId" required className={cls}><option value="">Chọn vị trí</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label className="block text-sm font-semibold">Điểm đánh giá (0–100)<input name="score" type="number" required min={0} max={100} step={1} className={cls} /></label>
    <label className="block text-sm font-semibold">Nhận xét và bằng chứng<textarea name="feedback" rows={5} minLength={20} maxLength={4000} required className={cls} /></label>
    <label className="flex items-start gap-3 text-sm text-muted"><input type="checkbox" name="consent" required className="mt-1" /><span>Tôi đã trực tiếp đánh giá ứng viên và được ứng viên đồng ý ghi nhận nhận xét này.</span></label>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-sm text-teal-800">{state.success}</p>}
    <button disabled={pending} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Đang lưu…" : "Lưu đánh giá Mentor"}</button>
  </form>;
}
