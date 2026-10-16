import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser, hasRole } from "@/lib/auth/session";
import { getCandidateOverview } from "@/lib/report/data";

export const metadata = { title: "Tổng quan | Ready2Work" };

export default async function DashboardPage() {
  const user = await requireUser();
  if (hasRole(user, "employer_pending", "employer_member", "employer_admin")) redirect("/business");
  const data = await getCandidateOverview(user.id);
  const progress = [
    { title: "Lộ trình AI", href: "/roadmap/cv", ...data.progress.roadmap, note: data.cv ? `Đã phân tích CV cho ${data.cv.position_title}; theo dõi cả các bước kế hoạch học tập đã tạo.` : "Tải CV để bắt đầu phân tích theo vị trí mục tiêu." },
    { title: "Mô phỏng việc làm", href: "/simulations", ...data.progress.simulation, note: "Nhiệm vụ đã được chấm / tổng nhiệm vụ trong thư viện." },
    { title: "Luyện phỏng vấn", href: "/interviews", ...data.progress.interview, note: "Vị trí đã hoàn thành / bộ phỏng vấn có đủ ba vòng." },
  ];
  const completedSimulations = data.latestSubmissions.filter((submission) => submission.overall_score !== null).slice(0, 3);
  return (
    <AppShell active="dashboard" displayName={user.displayName}>
      <main className="mx-auto max-w-7xl space-y-8 px-6 py-9 sm:px-8">
        <section className="relative overflow-hidden rounded-3xl bg-[#073c4e] px-7 py-9 text-white sm:px-10">
          <div className="absolute -right-12 -top-20 h-80 w-80 rounded-full border-[45px] border-white/5" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#8ee3df]">Hành trình nghề nghiệp của bạn</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Welcome{user.displayName ? `, ${user.displayName}` : ""}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">Mỗi trải nghiệm là một bước tiến. Theo dõi tiến độ thực tế, tiếp tục bài đang làm và xây dựng hồ sơ năng lực của riêng bạn.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/roadmap/cv" className="rounded-xl bg-[#74ddd2] px-5 py-3 text-sm font-bold text-[#083d46]">{data.cv ? "Xem lộ trình AI" : "Bắt đầu với CV của bạn"}</Link><Link href="/report" className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold">Xem báo cáo năng lực →</Link></div>
        </section>
        <section aria-label="Tiến trình của bạn" className="grid gap-4 md:grid-cols-3">
          {progress.map((item) => <Link key={item.title} href={item.href} className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-colors hover:border-primary">
            <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{item.title}</h2><span className="text-xl font-bold text-primary">{item.percent}%</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={item.title} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} /></div>
            <p className="mt-3 text-xs font-semibold text-foreground">{item.completed}/{item.total} {item.title === "Lộ trình AI" ? "bước" : "nội dung"} hoàn thành</p><p className="mt-2 text-xs leading-5 text-muted">{item.note}</p>
          </Link>)}
        </section>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Hoạt động phỏng vấn gần đây</h2><Link href="/interviews" className="text-xs font-semibold text-primary">Khám phá →</Link></div>
            {!data.sessions.length && <div className="mt-6 rounded-xl bg-surface p-6 text-sm leading-6 text-muted">Bạn chưa bắt đầu buổi phỏng vấn nào. Chọn vị trí phù hợp để thực hành ba vòng và nhận đánh giá theo từng câu hỏi.</div>}
            <div className="mt-4 divide-y divide-border">{data.sessions.slice(0, 5).map((session) => {
              const set = data.interviewSets.find((row) => row.id === session.set_id);
              return <Link href={`/interviews/sessions/${session.id}${session.completed_at ? "/feedback" : ""}`} key={session.id} className="flex items-center justify-between gap-4 py-4"><div><h3 className="text-sm font-semibold">{set?.position_title ?? "Buổi luyện phỏng vấn"}</h3><p className="mt-1 text-xs text-muted">{set?.industry} · {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(session.created_at))}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${session.completed_at ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"}`}>{session.completed_at ? `${session.overall_score}/100 · Hoàn thành` : "Đang thực hiện →"}</span></Link>;
            })}</div>
          </section>
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-xl font-bold">Gợi ý cho bạn</h2><p className="mt-2 text-xs leading-5 text-muted">Các trải nghiệm đã hoàn thành và nhiệm vụ tiếp theo trong cùng lĩnh vực.</p>
            <div className="mt-4 space-y-3">{completedSimulations.map((submission) => {
              const simulation = data.simulations.find((row) => row.id === submission.simulation_id);
              return <Link href={`/simulations/submissions/${submission.id}`} key={submission.id} className="block rounded-xl bg-[#eff9f7] p-4"><p className="text-xs font-semibold text-primary">✓ Đã hoàn thành · {submission.overall_score}/100</p><h3 className="mt-1 text-sm font-semibold">{simulation?.position_title}</h3></Link>;
            })}{data.recommendations.map((simulation) => <Link href={`/simulations/${simulation.slug}`} key={simulation.id} className="block rounded-xl border border-border p-4"><p className="text-xs text-muted">Tiếp tục lĩnh vực {simulation.industry}</p><h3 className="mt-1 text-sm font-semibold">{simulation.position_title} →</h3></Link>)}</div>
            {!completedSimulations.length && <div className="mt-5 rounded-xl bg-surface p-5 text-sm leading-6 text-muted">Hoàn thành mô phỏng đầu tiên để nhận gợi ý từ lịch sử của bạn.<Link href="/simulations" className="mt-3 block font-semibold text-primary">Chọn nhiệm vụ đầu tiên →</Link></div>}
            {!!completedSimulations.length && !data.recommendations.length && <Link href="/simulations" className="mt-4 block text-sm font-semibold text-primary">Khám phá các nhiệm vụ trong thư viện →</Link>}
          </section>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold text-primary"><Link href="/career-discovery">Khám phá nghề nghiệp</Link><Link href="/roadmap/new">Tạo kế hoạch học tập</Link><Link href="/account">Account settings</Link>{(user.roles.includes("admin") || user.roles.includes("super_admin")) && <Link href="/admin/role-applications">Review role applications</Link>}</div>
      </main>
    </AppShell>
  );
}
