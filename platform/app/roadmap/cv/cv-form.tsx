"use client";
import { useActionState } from "react";
import { analyzeCVAction } from "./actions";

export function CVForm({ positions }: { positions: { id: string; title: string; industry: string }[] }) {
  const [state, action, pending] = useActionState(analyzeCVAction, {});
  return <form action={action} className="space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm">
    <label className="block text-sm font-semibold">Vị trí mục tiêu
      <select name="positionId" required className="mt-2 block w-full rounded-lg border border-border bg-white p-3">
        <option value="">Chọn vị trí bạn muốn ứng tuyển</option>
        {positions.map((p) => <option key={p.id} value={p.id}>{p.industry} · {p.title}</option>)}
      </select>
    </label>
    <label className="block text-sm font-semibold">Tải CV
      <input name="cv" type="file" accept=".pdf,.docx,.txt" className="mt-2 block w-full rounded-xl border border-dashed border-primary bg-primary/5 p-5 text-sm" />
      <span className="mt-2 block text-xs font-normal text-muted">PDF có văn bản, DOCX hoặc TXT · Tối đa 3 MB, 15 trang PDF.</span>
    </label>
    <label className="block text-sm font-semibold">Hoặc dán nội dung CV
      <textarea name="cvText" rows={6} maxLength={40000} className="mt-2 block w-full rounded-lg border border-border p-3 font-normal" placeholder="Kinh nghiệm, kỹ năng, công cụ, dự án và chứng chỉ..." />
    </label>
    <label className="flex items-start gap-3 text-sm text-muted"><input name="consent" type="checkbox" required className="mt-1" />
      <span>Tôi đồng ý lưu CV trong tài khoản và xử lý nội dung để phân tích năng lực. Khi bật AI, nội dung văn bản được gửi đến nhà cung cấp AI của nền tảng.</span>
    </label>
    {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>}
    {state.success && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{state.success}</p>}
    <button disabled={pending} className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Đang phân tích CV…" : "Phân tích với Golden Profile"}</button>
  </form>;
}
