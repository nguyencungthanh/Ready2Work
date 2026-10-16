import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { Radar } from "@/components/reference/ui";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CriterionResult } from "@/lib/simulation/ai-evaluator";

interface StoredScores {
  summary: string;
  criteria: CriterionResult[];
}

/** Submission feedback (feature spec section 3: score, feedback, improvement suggestions). */
export default async function SimulationSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: submission } = await supabase
    .from("simulation_submissions")
    .select("id, user_id, simulation_id, overall_score, overall_band, criterion_scores, submitted_at, actual_duration_seconds")
    .eq("id", submissionId)
    .maybeSingle();

  if (!submission || submission.user_id !== user.id) notFound();

  const { data: simulation } = await supabase
    .from("simulations")
    .select("position_title, industry")
    .eq("id", submission.simulation_id)
    .maybeSingle();

  const stored = (submission.criterion_scores as StoredScores | null) ?? {
    summary: "",
    criteria: [],
  };
  const criteria = stored.criteria ?? [];

  const values=criteria.filter(c=>c.maxScore>0).map(c=>({label:c.skill||c.label,score:c.score/c.maxScore*100}));
  return <AppShell active="simulations" displayName={user.displayName}><main className="d-main"><div id="dash-tab-simulation"><section className="page-screen active"><div className="report-card"><div className="report-header"><div><h1 className="text-[22px] font-extrabold">Báo cáo kết quả (Performance Review)</h1><p className="text-xs text-muted mt-2">{new Date(submission.submitted_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})} · {user.displayName} · {simulation?.position_title}</p></div><div className="flex gap-3 flex-wrap"><Link href="/simulations" className="submit-btn">Trở về Simulation Hub</Link><Link href="/dashboard" className="back-btn">Về Tổng quan</Link></div></div><div className="score-summary-grid"><section className="score-box"><h2 className="text-xs font-bold uppercase text-green-800">Thẻ Điểm Tổng (Overall Score)</h2><div className="score-number">{submission.overall_score??"—"}<span className="text-xl">/100</span></div><p className="text-xs font-semibold text-green-700">{submission.overall_band||"Chưa có dữ liệu đánh giá"}</p></section><section className="percentile-box"><h2 className="text-sm font-bold text-blue-900">Xếp hạng (Percentile Ranking)</h2><p className="mt-3 text-sm leading-6 text-blue-900">Chưa có dữ liệu tổng hợp ứng viên để xác định percentile. Điểm của bạn được tính theo tiêu chí riêng của nhiệm vụ.</p></section><section className="radar-chart-box"><Radar values={values}/></section></div><section className="sim-overall-feedback"><h2>✧ Tổng quan nhận xét từ AI</h2><p>{stored.summary||"Chưa có nhận xét tổng hợp."}</p>{submission.actual_duration_seconds!==null&&<p className="mt-3 text-xs">Thời gian làm bài: {Math.floor(submission.actual_duration_seconds/60)} phút {submission.actual_duration_seconds%60} giây.</p>}</section><div className="sim-strengths-gaps"><section><h2>✓ Điểm mạnh ghi nhận</h2><ul>{criteria.filter(c=>c.maxScore>0&&c.score/c.maxScore>=.75).map(c=><li key={c.criterionId}><strong>{c.label}</strong><p>{c.feedback}</p></li>)}</ul>{!values.some(v=>v.score>=75)&&<p className="text-xs text-muted">Chưa có tiêu chí đạt mức 75% trở lên.</p>}</section><section><h2>⚠ Khoảng cách kỹ năng (Skill Gaps)</h2><ul>{criteria.filter(c=>c.maxScore>0&&c.score/c.maxScore<.75).map(c=><li key={c.criterionId}><strong>{c.label}</strong><p>{c.feedback}</p></li>)}</ul>{!values.some(v=>v.score<75)&&<p className="text-xs text-muted">Không có tiêu chí dưới mức 75%.</p>}</section></div><section className="rubric-breakdown"><h2>Chi tiết Đánh giá theo Barem Tiêu chí (Criteria Breakdown)</h2>{criteria.map(c=><article className="sim-criterion" key={c.criterionId}><div><strong>{c.label}</strong><span>{c.score}/{c.maxScore} · {c.band}</span></div><p>{c.feedback}</p></article>)}</section><Link href="/report" className="reference-link mt-6 block">Xem báo cáo năng lực tổng hợp →</Link></div></section></div></main></AppShell>;
}
