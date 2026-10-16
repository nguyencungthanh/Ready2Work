import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getCandidateOverview } from "@/lib/report/data";
import { PrintReportButton } from "./print-button";
import { SkillRadar } from "./skill-radar";
import "./report.css";

export const metadata = { title: "Báo cáo năng lực | Ready2Work" };

export default async function ReportPage() {
  const user = await requireUser();
  const data = await getCandidateOverview(user.id);
  const generatedAt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const score = data.readiness.score;
  const circumference = 2 * Math.PI * 62;
  return <AppShell active="report" displayName={user.displayName}>
    <main className="mx-auto max-w-6xl px-6 py-9 sm:px-8">
      <div className="report-controls mb-7 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Báo cáo năng lực</h1><p className="mt-1 text-sm text-muted">Hồ sơ được tổng hợp từ lịch sử thực hiện trong tài khoản của bạn.</p></div><PrintReportButton /></div>
      <article className="report-document space-y-6">
        <section className="report-card overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <div className="bg-[#073c4e] px-7 py-5 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#8ee3df]">Ready2Work · Career Readiness Portfolio</p><h1 className="mt-2 text-2xl font-bold">Hồ sơ năng lực ứng viên</h1></div>
          <div className="report-grid grid gap-8 p-7 md:grid-cols-[1.2fr_1fr]">
            <div><div className="flex items-center gap-4"><span aria-label="Ảnh đại diện bằng tên viết tắt" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">{(user.displayName || user.email || "R").slice(0, 1).toUpperCase()}</span><div><h2 className="text-2xl font-bold">{user.displayName || user.email}</h2><p className="mt-1 text-sm text-muted">{user.email}</p></div></div>
              <dl className="mt-6 space-y-3 text-sm"><div><dt className="text-xs text-muted">Vị trí mục tiêu</dt><dd className="mt-1 font-semibold">{data.target?.title ?? "Chưa chọn vị trí mục tiêu"}</dd></div><div><dt className="text-xs text-muted">Thời điểm tạo báo cáo · Giờ Việt Nam</dt><dd className="mt-1">{generatedAt}</dd></div></dl>
              <p className={`mt-5 inline-block rounded-full px-4 py-2 text-xs font-semibold ${score === null ? "bg-amber-50 text-amber-900" : "bg-teal-50 text-teal-800"}`}>{data.readiness.badge}</p>
            </div>
            <div className="text-center"><div className="relative mx-auto h-44 w-44"><svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="80" cy="80" r="62" fill="none" stroke="#e7f0f2" strokeWidth="12" /><circle cx="80" cy="80" r="62" fill="none" stroke="#008b8b" strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - (score ?? 0) / 100)} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-4xl text-[#073c4e]">{score ?? "—"}</strong><span className="mt-1 text-xs text-muted">Career Readiness / 100</span></div></div>
              {score === null && <p className="mx-auto max-w-xs text-xs leading-5 text-muted">Điểm chính thức sẽ xuất hiện khi có đủ tiến độ mô phỏng, kết quả ba vòng phỏng vấn và đánh giá Mentor cùng vị trí.</p>}
            </div>
          </div>
          <div className="grid border-t border-border bg-surface/70 sm:grid-cols-3">{data.readiness.components.map((component) => <div key={component.key} className="border-border p-5 sm:border-r last:border-0"><p className="text-xs text-muted">{component.label} · {component.weight}%</p><p className="mt-2 text-xl font-bold">{component.score === null ? "Chưa có" : `${component.score}/100`}</p></div>)}</div>
          <p className="px-7 py-4 text-xs leading-5 text-muted">Công thức: 30% × tỷ lệ hoàn thành các nhiệm vụ của vị trí mục tiêu + 40% × điểm buổi phỏng vấn ba vòng gần nhất + 30% × điểm Mentor gần nhất cho cùng vị trí. Các thành phần dùng thang 0–100. Khi thiếu dữ liệu, hệ thống không thay bằng 0 hoặc đổi trọng số.</p>
        </section>
        <div className="report-grid grid gap-6 lg:grid-cols-2">
          <section className="report-card report-task-list rounded-2xl border border-border bg-white p-6"><p className="text-xs font-bold uppercase tracking-wider text-primary">Tiến độ & kết quả</p><h2 className="mt-2 text-xl font-bold">Mô phỏng việc làm</h2><p className="mt-3 text-3xl font-bold">{data.targetSubmissions.length}<span className="text-lg font-normal text-muted">/{data.targetSimulations.length} nhiệm vụ</span></p><p className="mt-1 text-xs text-muted">{data.completion ?? 0}% hoàn thành thư viện nhiệm vụ của vị trí mục tiêu</p>
            {!data.targetSimulations.length && <p className="mt-5 rounded-xl bg-surface p-5 text-sm leading-6 text-muted">Chọn vị trí bằng cách phân tích CV hoặc bắt đầu một trải nghiệm để tạo hồ sơ theo mục tiêu.</p>}
            <ul className="mt-5 divide-y divide-border">{data.targetSimulations.map((simulation) => {
              const submission = data.targetSubmissions.find((row) => row.simulation_id === simulation.id);
              return <li key={simulation.id} className="py-4"><div className="flex items-start justify-between gap-3"><div><span className={`text-xs font-semibold ${submission ? "text-primary" : "text-muted"}`}>{submission ? "✓ Đã hoàn thành" : "○ Chưa thực hiện"}</span><p className="mt-1 text-sm font-semibold">{simulation.position_title}</p></div><strong className="shrink-0 text-sm">{submission ? `${submission.overall_score}/100` : "—"}</strong></div>{submission && <Link href={`/simulations/submissions/${submission.id}`} className="report-controls mt-2 inline-block text-xs font-semibold text-primary">Xem nhận xét theo tiêu chí →</Link>}</li>;
            })}</ul>
            {data.completedInterview && <div className="mt-4 rounded-xl bg-surface p-4"><h3 className="text-sm font-semibold">Kết quả phỏng vấn gần nhất</h3><div className="mt-3 flex flex-wrap gap-4">{data.completedInterview.round_scores?.map((round) => <p key={round.round} className="text-xs text-muted">Vòng {round.round}: <strong className="text-foreground">{round.score}/100</strong></p>)}</div></div>}
          </section>
          <section className="report-card rounded-2xl border border-border bg-white p-6"><p className="text-xs font-bold uppercase tracking-wider text-primary">Năng lực đã ghi nhận</p><h2 className="mt-2 text-xl font-bold">Bản đồ kỹ năng</h2><div className="mt-3"><SkillRadar skills={data.measuredSkills} /></div></section>
        </div>
        <section className="report-card report-grid grid gap-6 rounded-2xl border border-border bg-white p-6 md:grid-cols-2"><div><h2 className="text-lg font-bold text-teal-800">Điểm mạnh nổi bật</h2>{data.strengths.length ? <ul className="mt-4 space-y-3 text-sm leading-6">{data.strengths.map((strength, i) => <li key={i} className="rounded-xl bg-teal-50 p-4">{strength}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted">Chưa có đủ bằng chứng từ CV hoặc bài làm để xác định điểm mạnh.</p>}</div><div><h2 className="text-lg font-bold text-amber-800">Khu vực cần cải thiện</h2>{data.gaps.length ? <ul className="mt-4 space-y-3 text-sm leading-6">{data.gaps.map((gap, i) => <li key={i} className="rounded-xl bg-amber-50 p-4">{gap}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-muted">Chưa ghi nhận khoảng cách kỹ năng cần cải thiện. Tiếp tục thực hành để có đánh giá đầy đủ hơn.</p>}</div></section>
        <p className="text-xs leading-5 text-muted">Nguồn: CV đã phân tích và kết quả thực hành được lưu theo tài khoản. {data.cv?.result.provider === "rules" ? "Phân tích CV hiện dùng đối chiếu từ khóa và được ghi rõ trong kết quả." : ""} Báo cáo hỗ trợ định hướng học tập; điểm số không thay thế quyết định tuyển dụng.</p>
      </article>
      <section className="report-controls mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#e6f7f4] p-6"><div><h2 className="font-bold">Tiếp tục xây dựng hồ sơ năng lực của bạn</h2><p className="mt-1 text-xs leading-5 text-muted">Nút tải mở hộp thoại in của trình duyệt. Chọn “Save as PDF” để lưu hồ sơ với bố cục giấy A4.</p></div><div className="flex flex-wrap items-center gap-4"><Link href={data.target?.id ? `/simulations?position=${encodeURIComponent(data.target.id)}` : "/simulations"} className="text-sm font-bold text-primary">Luyện tập tiếp →</Link><PrintReportButton /></div></section>
    </main>
  </AppShell>;
}
