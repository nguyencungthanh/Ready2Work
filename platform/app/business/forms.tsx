"use client";
import { useActionState, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { saveCompanyAction, uploadBusinessContentAction } from "./actions";

const inputClass = "mt-2 block w-full rounded-lg border border-border bg-white p-3 font-normal";
export function CompanyForm({ company, onSaved }: { onSaved?:()=>void; company: { name: string; website: string; industry: string; contact_name: string } | null }) {
  const [extra,setExtra]=useState<Record<string,string>>({});
  useEffect(()=>{let active=true;void createBrowserSupabaseClient().auth.getUser().then(({data})=>{if(active)setExtra({...data.user?.user_metadata.company_preferences,email:data.user?.user_metadata.company_preferences?.email||data.user?.email||""})});return()=>{active=false}},[]);
  const [state, action, pending] = useActionState(async(previous:import("./actions").BusinessState,formData:FormData)=>{
    const result=await saveCompanyAction(previous,formData);if(result.error)return result;
    const preferences={phone:String(formData.get("company_phone")??"").trim().slice(0,40),email:String(formData.get("company_email")??"").trim().slice(0,250),about:String(formData.get("company_about")??"").trim().slice(0,2000)};
    const {error}=await createBrowserSupabaseClient().auth.updateUser({data:{company_preferences:preferences}});
    return error?{success:"Đã lưu hồ sơ chính; thông tin liên hệ bổ sung chưa lưu được. Vui lòng thử lại."}:result;
  }, {});
  useEffect(()=>{if(state.success)onSaved?.()},[state.success,onSaved]);
  return <form action={action} className="grid gap-4 rounded-2xl border border-border bg-white p-6 sm:grid-cols-2">
    {[{ key: "name", label: "Tên doanh nghiệp" }, { key: "industry", label: "Lĩnh vực hoạt động" }, { key: "website", label: "Website (không bắt buộc)" }, { key: "contact_name", label: "Người liên hệ" }].map(({ key, label }) =>
      <label key={key} className="text-sm font-semibold">{label}<input name={key} defaultValue={company?.[key as keyof typeof company] ?? ""} required={key !== "website"} maxLength={250} type={key === "website" ? "url" : "text"} placeholder={key === "website" ? "https://congty.vn" : ""} className={inputClass} /></label>)}
    <label className="text-sm font-semibold">Email liên hệ<input name="company_email" type="email" defaultValue={extra.email||""} maxLength={250} className={inputClass}/></label>
    <label className="text-sm font-semibold">Số điện thoại<input name="company_phone" defaultValue={extra.phone||""} maxLength={40} className={inputClass}/></label>
    <label className="sm:col-span-2 text-sm font-semibold">Giới thiệu ngắn<textarea name="company_about" defaultValue={extra.about||""} maxLength={2000} rows={3} className={inputClass}/></label>
    <div className="sm:col-span-2">{state.error && <p role="alert" className="mb-3 text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="mb-3 text-sm text-teal-800">{state.success}</p>}
      <button disabled={pending} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Đang lưu…" : "Lưu hồ sơ doanh nghiệp"}</button></div>
  </form>;
}
export function ContentForm({ positions }: { positions: { id: string; title: string; industry: string }[] }) {
  const [kind, setKind] = useState("simulation");
  const [state, action, pending] = useActionState(uploadBusinessContentAction, {});
  return <form action={action} className="space-y-4 rounded-2xl border border-border bg-white p-6">
    <label className="block text-sm font-semibold">Loại nội dung<select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className={inputClass}><option value="simulation">Mô phỏng việc làm</option><option value="interview">Luyện phỏng vấn</option></select></label>
    <label className="block text-sm font-semibold">Tiêu đề<input name="title" required minLength={5} maxLength={200} className={inputClass} /></label>
    <label className="block text-sm font-semibold">Vị trí<select name="positionId" required className={inputClass}><option value="">Chọn vị trí</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
    <label className="block text-sm font-semibold">Đề bài {kind === "simulation" ? "(PDF, DOCX, TXT)" : "phỏng vấn ba vòng (JSON)"}<input name="assignment" type="file" accept={kind === "simulation" ? ".pdf,.docx,.txt" : ".json"} required className={inputClass} /></label>
    <label className="block text-sm font-semibold">Tiêu chí chấm điểm (JSON)<input name="rubric" type="file" accept=".json" required className={inputClass} /></label>
    <p className="text-sm text-muted">Cả hai tệp luôn được lưu cùng một đề bài. <a className="font-semibold text-primary underline" href={`/templates/${kind}-rubric.json`} download>Tải mẫu tiêu chí</a>{kind === "interview" && <> · <a className="font-semibold text-primary underline" href="/templates/interview-assignment.json" download>Tải mẫu đề phỏng vấn ba vòng</a></>}</p>
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="text-sm text-teal-800">{state.success}</p>}
    <button disabled={pending} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Đang tải lên…" : "Lưu đề bài và tiêu chí"}</button>
  </form>;
}
