import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { Radar, ScoreRing } from "@/components/reference/ui";
import { FeedbackChat } from "@/components/reference/feedback-chat";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface AnswerCriterion {
  label: string;
  score: number;
  maxScore: number;
  note: string;
}

export default async function InterviewFeedbackPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: session } = await supabase
    .from("interview_sessions")
    .select("id, user_id, overall_score, completed_at, set_id, round_scores")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== user.id || !session.completed_at) {
    notFound();
  }

  const [{ data: interviewSet }, { data: answers }, { data: questions }] = await Promise.all([
    supabase
      .from("interview_sets")
      .select("position_title, company_name, industry")
      .eq("id", session.set_id)
      .maybeSingle(),
    supabase
      .from("interview_answers")
      .select("answer_text, score, criteria, question_id")
      .eq("session_id", sessionId),
    supabase
      .from("interview_questions")
      .select("id, position, prompt, round_number")
      .eq("set_id", session.set_id)
      .order("position"),
  ]);

  const promptById = new Map((questions ?? []).map((q) => [q.id, q]));

  const rows = (answers ?? [])
    .map((a) => ({
      ...a,
      question: promptById.get(a.question_id),
    }))
    .sort((a, b) => (a.question?.position ?? 0) - (b.question?.position ?? 0));

  const rounds=(session.round_scores??[]) as {round:number;score:number;questionCount:number}[];
  const notes=rows.flatMap(row=>((row.criteria as AnswerCriterion[]|null)??[]).filter(c=>c.maxScore>0).map(c=>({label:c.label,score:c.score/c.maxScore*100,note:c.note,round:row.question?.round_number??1})));
  const feedback=notes.filter(n=>n.note).slice(0,3);
  return <AppShell active="interviews" displayName={user.displayName}><main className="d-main"><div id="dash-tab-interview"><div className="iv-page-screen iv-active"><div className="iv-report-container"><Link href="/interviews" className="iv-report-back">← Quay lại lịch sử phỏng vấn</Link><header className="iv-report-header-split"><div><h1 className="iv-report-h-title">Báo cáo đánh giá phỏng vấn</h1><p className="iv-report-h-sub">Dưới đây là kết quả chi tiết từ buổi phỏng vấn mô phỏng. Hãy xem lại số điểm, nhận xét để cải thiện.</p></div><div className="iv-report-company-card"><span className="iv-rep-comp-logo">{(interviewSet?.company_name||"R2W").slice(0,3).toUpperCase()}</span><div className="iv-rep-comp-info"><h2 className="iv-rep-comp-name">{interviewSet?.company_name||"Ready2Work"}</h2><p className="iv-rep-comp-pos">{interviewSet?.position_title}</p><span className="iv-rep-comp-badge">{interviewSet?.industry}</span></div><p className="iv-rep-comp-date">Ngày thực hiện<strong>{new Date(session.completed_at).toLocaleDateString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</strong></p></div></header><div className="iv-metrics-grid"><section className="iv-metric-card"><h2 className="iv-metric-card-title">★ Điểm tổng</h2><ScoreRing score={session.overall_score}/><p className="iv-score-desc">Điểm tổng hợp của ba vòng phỏng vấn</p><span className="iv-score-diff-pill">{rows.length} câu trả lời đã lưu</span></section><section className="iv-metric-card"><h2 className="iv-metric-card-title">Biểu đồ Radar</h2><div className="iv-radar-wrap"><Radar values={rounds.map(r=>({label:`Vòng ${r.round}`,score:r.score}))}/></div></section><section className="iv-metric-card"><h2 className="iv-metric-card-title">Nhận xét từ AI</h2><div className="iv-review-text">{feedback.map((n,i)=><p className="mb-3" key={i}>{n.note}</p>)}{!feedback.length&&<p>Chưa có nhận xét chi tiết được lưu.</p>}</div><div className="iv-highlight-skills-box"><h3 className="iv-hl-title">ⓘ Tiêu chí đạt từ 75%</h3><div className="iv-hl-tags">{[...new Set(notes.filter(n=>n.score>=75).map(n=>n.label))].slice(0,4).map(label=><span key={label} className="iv-hl-tag">{label}</span>)}</div></div><a href="#interview-details" className="iv-review-link">Xem chi tiết →</a></section></div><h2 id="interview-details" className="iv-acc-title">Chi tiết câu hỏi</h2>{[1,2,3].map(round=><details className="iv-round-detail" key={round} open={round===1}><summary>Vòng {round}: {round===1?"Tổng quan":round===2?"Chuyên môn":"Tình huống"} · {rounds.find(r=>r.round===round)?.score??"—"}/100</summary>{rows.filter(row=>row.question?.round_number===round).map((row,index)=><article key={row.question_id}><h3 className="font-bold text-sm">Câu {index+1}: {row.question?.prompt}</h3><div className="iv-answer-pair"><div><h4>Câu trả lời của bạn</h4><p>{row.answer_text}</p></div><div><h4>Đánh giá theo tiêu chí · {row.score}/100</h4><ul>{((row.criteria as AnswerCriterion[]|null)??[]).map(c=><li className="mb-3" key={c.label}><strong>{c.label} · {c.score}/{c.maxScore}</strong><p>{c.note}</p></li>)}</ul></div></div></article>)}<div className="p-6"><FeedbackChat notes={notes.filter(n=>n.round===round)}/></div></details>)}<section className="iv-report-cta-box"><h2 className="iv-cta-h">Bạn đã đạt được {session.overall_score}/100 điểm</h2><p className="iv-cta-sub">Lưu lại kết quả và tiếp tục luyện tập để tự tin hơn trong buổi phỏng vấn thật.</p><Link href="/report" className="iv-cta-btn-main">Xem hồ sơ năng lực</Link><div className="iv-cta-actions-sub"><span>Hoặc bạn có thể:</span><Link href="/interviews?explore=1" className="iv-cta-sub-btn">↻ Làm lại đề này</Link><button disabled title="Chức năng đặt lịch Mentor chưa được kết nối" className="iv-cta-sub-btn opacity-60">Book Mentor thật · Chưa mở</button></div></section><p className="text-xs text-muted mt-6">Điểm dùng để học tập và cải thiện nội dung trả lời; không phải quyết định tuyển dụng. Giọng nói, danh tính và cách phát âm không được dùng để chấm.</p></div></div></div></main></AppShell>;
}
