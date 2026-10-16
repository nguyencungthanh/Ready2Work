import Link from "next/link";
import { DashboardSearch,DashboardAssistant,DashboardActivity } from "@/components/reference/dashboard-controls";
import { OnboardingGate } from "@/components/reference/onboarding";
import { publicPositionCatalog } from "@/lib/content/catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CVAnalysis } from "@/lib/cv/analyzer";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReferenceIcon } from "@/components/reference/icon";
import { requireUser, hasRole } from "@/lib/auth/session";
import { getCandidateOverview } from "@/lib/report/data";

export const metadata = { title: "Tổng quan | Ready2Work" };
export default async function DashboardPage() {
 const user = await requireUser();
 if (hasRole(user, "employer_pending", "employer_member", "employer_admin")) redirect("/business");
 const data = await getCandidateOverview(user.id);
 const client=await createServerSupabaseClient();
 const {data:profile}=await client.from("profiles").select("university,major,graduation_year,onboarding_status").eq("id",user.id).maybeSingle();
 const progress = [
  { title:"Lộ trình AI", badge:"Roadmap", icon:"roadmap", color:"green", href:"/roadmap/cv", ...data.progress.roadmap, description:"Xác định kỹ năng hiện tại, nhận gợi ý lộ trình phát triển cá nhân hóa để sẵn sàng cho công việc mơ ước.", flow:"Tải CV → Phân tích năng lực → Nhận lộ trình cá nhân hóa" },
  { title:"Mô phỏng việc làm", badge:"Job Simulation", icon:"simulations", color:"blue", href:"/simulations", ...data.progress.simulation, description:"Trải nghiệm các nhiệm vụ thực tế từ doanh nghiệp, khám phá công việc phù hợp với năng lực và sở thích của bạn.", flow:"Chọn lĩnh vực → Thực hiện nhiệm vụ → Nhận đánh giá chi tiết" },
  { title:"Luyện phỏng vấn", badge:"Interview", icon:"interviews", color:"teal", href:"/interviews", ...data.progress.interview, description:"Luyện tập phỏng vấn theo vị trí mục tiêu, nhận phản hồi và cải thiện kỹ năng qua từng buổi thực hành.", flow:"Chọn vị trí → Tham gia phỏng vấn → Xem báo cáo đánh giá" },
 ];
 const completedSimulations=data.latestSubmissions.filter(s=>s.overall_score!==null).slice(0,3);
 return <AppShell active="dashboard" displayName={user.displayName}><main className="d-main"><OnboardingGate userId={user.id} profile={profile} positions={publicPositionCatalog()} analysis={data.cv?.result as CVAnalysis|undefined}/>
  <div className="d-greet-row"><div><h1 className="d-greet-title">Xin chào, {user.displayName || "Bạn"}</h1><p className="d-greet-sub">Hãy tiếp tục luyện tập để tiến gần hơn tới mục tiêu nghề nghiệp của bạn.</p></div><DashboardSearch/></div>
  <DashboardAssistant name={user.displayName}/>
  <section aria-label="Tiến trình của bạn">{progress.map(item=><article key={item.title} className={`d-feat-card d-feat--${item.color}`}><div className="d-feat-top"><div className={`d-feat-icon d-feat-icon--${item.color}`}><ReferenceIcon name={item.icon} size={28}/></div><div className="d-feat-info"><h2 className="d-feat-title">{item.title}<span className={`d-feat-badge d-feat-badge--${item.color}`}>{item.badge}</span></h2><p className="d-feat-desc">{item.description}</p><p className="d-feat-flow">{item.flow}</p><div className="d-feat-stats"><span className="d-feat-stat-num">{String(item.completed).padStart(2,"0")}</span><div><p className="d-feat-stat-compare">{item.completed}/{item.total} {item.icon === "roadmap" ? "bước" : "nội dung"} hoàn thành</p><p className="d-feat-stat-label">Tiến trình thực tế của bạn</p></div></div></div><div className="d-feat-progress" role="progressbar" aria-label={item.title} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}><svg width="90" height="90" viewBox="0 0 90 90" aria-hidden="true"><circle cx="45" cy="45" r="36" fill="none" stroke="#e8edf5" strokeWidth="7"/><circle cx="45" cy="45" r="36" fill="none" stroke={item.color==="green"?"#0ebfb8":item.color==="blue"?"#1d4ed8":"#0891b2"} strokeWidth="7" strokeDasharray="226.2" strokeDashoffset={226.2*(1-item.percent/100)} strokeLinecap="round" transform="rotate(-90 45 45)"/><text x="45" y="50" textAnchor="middle" fontSize="14" fontWeight="800" fill="#475569">{item.percent}%</text></svg><span className="d-ring-label">Tiến độ hoàn thành</span></div></div><Link className={`d-feat-link d-feat-link--${item.color}`} href={item.href}>Khám phá ngay →</Link></article>)}</section>
  <DashboardActivity completed={data.progress.interview.completed} sessions={data.sessions.map(session=>{const set=data.interviewSets.find(row=>row.id===session.set_id);return {...session,title:set?.position_title||"Buổi luyện phỏng vấn",industry:set?.industry||""}})}/>
  <section className="d-suggest"><h2 className="d-suggest-title">Gợi ý cho bạn</h2><p className="d-suggest-sub">Hãy chăm chỉ luyện tập mỗi ngày</p><div className="d-suggest-grid"><div className="d-suggest-card"><h3 className="d-suggest-card-label">Tiếp tục từ lần trước</h3><div className="d-suggest-card-body">{!completedSimulations.length && <p className="d-suggest-empty">Chưa có hoạt động nào trước đó.<br/>Hãy bắt đầu tính năng đầu tiên!</p>}{completedSimulations.map(submission=><Link className="mb-3 block reference-link" key={submission.id} href={`/simulations/submissions/${submission.id}`}>{data.simulations.find(s=>s.id===submission.simulation_id)?.position_title} · {submission.overall_score}/100 →</Link>)}</div></div><div className="d-suggest-card"><h3 className="d-suggest-card-label">Gợi ý cho bạn</h3><div className="d-suggest-card-body">{!data.recommendations.length && <p className="d-suggest-empty">Hãy thực hiện tính năng đầu tiên<br/>để nhận gợi ý phù hợp.</p>}{data.recommendations.map(simulation=><Link className="mb-3 block reference-link" href={`/simulations/${simulation.slug}`} key={simulation.id}>{simulation.position_title} →</Link>)}</div></div></div></section>
  <div className="flex flex-wrap gap-5 text-sm font-semibold text-primary"><Link href="/career-discovery">Khám phá nghề nghiệp</Link><Link href="/roadmap/new">Tạo kế hoạch học tập</Link><Link href="/report">Báo cáo năng lực</Link><Link href="/account">Account settings</Link>{(user.roles.includes("admin")||user.roles.includes("super_admin"))&&<Link href="/admin/role-applications">Review role applications</Link>}</div>
 </main></AppShell>;
}
