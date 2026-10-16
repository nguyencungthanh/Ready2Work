import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startSimulationAction } from "../actions";
import { AttemptTimer } from "./attempt-timer";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { SubmissionForm } from "./submission-form";
import type { RubricCriterion } from "@/lib/simulation/ai-evaluator";

export default async function SimulationDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ attempt?: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  // The rubric includes private answer-key guidance; only its public labels and weights are rendered.
  const { data: simulation } = await createServiceRoleClient().from("simulations")
    .select("id, industry, position_title, brief, task_instructions, estimated_minutes, rubric, min_words, is_available, unavailable_reason")
    .eq("slug", slug).maybeSingle();
  if (!simulation) notFound();
  const rubric = (simulation.rubric ?? []) as RubricCriterion[];
  const filters = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: attempt } = filters.attempt ? await supabase.from("simulation_attempts")
    .select("id, started_at, submitted_at, submission_id").eq("id", filters.attempt).eq("user_id", user.id).eq("simulation_id", simulation.id).maybeSingle() : { data: null };
  return <AppShell active="simulations" displayName={user.displayName}>
    <main className="mx-auto max-w-6xl px-6 py-9 sm:px-8"><Link href="/simulations" className="text-sm font-semibold text-primary">← Thư viện mô phỏng</Link><p className="mt-7 text-xs font-bold uppercase tracking-wider text-primary">{simulation.industry}</p><h1 className="mt-2 text-3xl font-bold">{simulation.position_title}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{simulation.brief}</p>
      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]"><div><section className="rounded-2xl border border-border bg-white p-6"><h2 className="text-xl font-bold">Task</h2><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-muted">{simulation.task_instructions}</p><p className="mt-5 rounded-xl bg-surface p-4 text-xs leading-6 text-muted">Thời gian dự kiến: {simulation.estimated_minutes} phút. {simulation.min_words > 0 ? `Nội dung cần tối thiểu ${simulation.min_words} từ để thể hiện đầy đủ lập luận.` : "Trình bày đầy đủ các yêu cầu trong đề bài."}</p></section>
        {simulation.is_available ? <div className="mt-6 rounded-2xl border border-border bg-white p-6"><h2 className="text-xl font-bold">Không gian bài làm</h2><p className="mt-2 text-sm leading-6 text-muted">Nhập phần phân tích, kết quả tính toán và đề xuất của bạn. Bài làm và nhận xét sẽ được lưu trong tài khoản.</p>{attempt && !attempt.submitted_at ? <><AttemptTimer startedAt={attempt.started_at} minutes={simulation.estimated_minutes} /><SubmissionForm simulationId={simulation.id} attemptId={attempt.id} /></> : attempt?.submission_id ? <Link href={`/simulations/submissions/${attempt.submission_id}`} className="mt-5 block font-semibold text-primary">Bài đã được chấm. Xem kết quả →</Link> : <form action={startSimulationAction} className="mt-5"><input type="hidden" name="simulationId" value={simulation.id} /><p className="mb-4 text-xs leading-6 text-muted">Bấm bắt đầu để ghi nhận thời gian làm bài. Mục chấm về thời gian sử dụng timestamp trên máy chủ.</p><button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Bắt đầu làm bài</button></form>}</div> : <p role="status" className="mt-6 rounded-xl bg-amber-50 p-5 text-sm text-amber-900">{simulation.unavailable_reason || "Nhiệm vụ đang được hoàn thiện nội dung và tiêu chí chấm."}</p>}
      </div><aside className="rounded-2xl border border-border bg-white p-6"><h2 className="font-bold">Scoring rubric</h2><p className="mt-2 text-xs leading-5 text-muted">Tiêu chí và trọng số được công bố trước khi làm bài. AI đối chiếu bài làm với hướng dẫn chấm riêng của nhiệm vụ.</p><ul className="mt-5 divide-y divide-border">{rubric.map((criterion) => <li key={criterion.id} className="flex justify-between gap-4 py-3 text-sm"><span>{criterion.label}</span><strong className="shrink-0 text-primary">{criterion.weight}%</strong></li>)}</ul><p className="mt-5 text-xs leading-5 text-muted">Sau khi gửi, bạn nhận điểm trên thang 100 và phản hồi theo từng tiêu chí.</p></aside></div>
    </main>
  </AppShell>;
}
