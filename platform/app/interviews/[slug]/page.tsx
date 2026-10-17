import Link from "next/link";
import { MicCheck } from "./mic-check";
import { AppShell } from "@/components/app-shell";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startInterviewSessionAction } from "../actions";
import { MarkdownMessage } from "@/components/markdown-message";
import { isSourceInterview, isPublishedBusinessContent } from "@/lib/content/source-catalog";

/** Interview set overview - shows the question count before starting a session. */
export default async function InterviewSetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: set } = await supabase
    .from("interview_sets")
    .select("id, slug, industry, position_title, company_name, description, is_available, unavailable_reason")
    .eq("slug", slug)
    .maybeSingle();

  if (!set || !(isSourceInterview(set) || isPublishedBusinessContent(set))) notFound();

  const { count } = await supabase
    .from("interview_questions")
    .select("id", { count: "exact", head: true })
    .eq("set_id", set.id);
  const { data: previewQuestions } = !set.is_available ? await supabase.from("interview_questions")
    .select("id, prompt, round_number, position").eq("set_id", set.id).order("round_number").order("position") : { data: null };

  return <AppShell active="interviews" displayName={user.displayName}><main className="d-main"><div id="dash-tab-interview"><div className="iv-page-screen iv-active"><div className="iv-waiting-top"><Link className="iv-back-link" href="/interviews?explore=1">← Quay lại danh sách</Link></div><header className="iv-waiting-hero"><span className="iv-hero-badge">Luyện phỏng vấn</span><h1 className="iv-waiting-title">Phòng chờ phỏng vấn</h1><p className="iv-waiting-pos-info">{set.company_name?`${set.company_name} · `:""}{set.position_title}</p></header><div className="iv-waiting-split"><section className="iv-wait-panel"><h2 className="iv-wait-panel-title">Cấu trúc buổi phỏng vấn</h2><p className="iv-wait-panel-sub">{count??0} câu hỏi qua ba vòng. Trả lời từng câu và nhận đánh giá theo tiêu chí của vị trí.</p><div className="iv-rounds-row">{["Câu hỏi Tổng quan","Chuyên môn","Tình huống"].map((name,i)=><div key={name} className="iv-round-card"><span className="iv-round-num">{i+1}</span><h3 className="iv-round-label">Vòng {i+1}</h3><p className="iv-round-name">{name}</p></div>)}</div><div className="iv-alert-box"><span>ⓘ</span><div><h3 className="iv-alert-box-title">Lưu ý quan trọng</h3><p className="iv-alert-box-text">Chuẩn bị không gian yên tĩnh, đọc kỹ câu hỏi và trả lời bằng trải nghiệm của bạn. Điểm đánh giá dựa trên nội dung trả lời; giọng nói và danh tính không được dùng để chấm.</p></div></div>{!set.is_available&&<p role="status" className="auth-error">{set.unavailable_reason||"Bộ câu hỏi đang chờ xác nhận cấu hình chấm điểm theo tài liệu gốc."}</p>}</section><section className="iv-wait-panel"><h2 className="iv-wait-panel-title">Kiểm tra thiết bị</h2><p className="iv-wait-panel-sub">Kiểm tra microphone nếu bạn muốn nhập câu trả lời bằng giọng nói. Bạn luôn có thể sử dụng văn bản.</p><MicCheck/></section></div>{!set.is_available&&previewQuestions&&<section className="iv-wait-panel my-6"><h2 className="iv-wait-panel-title">Nội dung câu hỏi theo tài liệu gốc</h2>{[1,2,3].map(round=><section key={round} className="my-5"><h3 className="font-bold mb-3">Vòng {round}</h3><ol className="list-decimal space-y-3 pl-5">{previewQuestions.filter(question=>question.round_number===round).map(question=><li key={question.id}><MarkdownMessage>{question.prompt}</MarkdownMessage></li>)}</ol></section>)}</section>}<form action={startInterviewSessionAction} className="text-center"><input type="hidden" name="setId" value={set.id}/><button disabled={!set.is_available} className="iv-start-btn disabled:opacity-40">Bắt đầu Phỏng vấn</button></form></div></div></main></AppShell>;
}
