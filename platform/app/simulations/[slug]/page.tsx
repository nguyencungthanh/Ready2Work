import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { startSimulationAction } from "../actions";
import { WaitingSimulation } from "./waiting";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { SubmissionForm } from "./submission-form";
import type { RubricCriterion } from "@/lib/simulation/ai-evaluator";
import { publicSimulationMaterials } from "@/lib/simulation/materials";
import { simulationHasSourceTimeLimit } from "@/lib/content/simulation-timing";
import { isSourceSimulation, isPublishedBusinessContent } from "@/lib/content/source-catalog";

export const maxDuration = 180;

export default async function SimulationDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ attempt?: string; preview?: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  // The rubric includes private answer-key guidance; only its public labels and weights are rendered.
  const { data: simulation } = await createServiceRoleClient().from("simulations")
    .select("id, slug, industry, position_title, brief, task_instructions, estimated_minutes, rubric, min_words, is_available, unavailable_reason, reference_data, position_id")
    .eq("slug", slug).maybeSingle();
  if (!simulation || !(isSourceSimulation(simulation) || isPublishedBusinessContent(simulation))) notFound();
  const rubric = (simulation.rubric ?? []) as RubricCriterion[];
  const materials = publicSimulationMaterials(simulation.reference_data);
  const timeLimitSpecified = simulationHasSourceTimeLimit(simulation.position_id);
  const filters = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: attempt } = filters.attempt ? await supabase.from("simulation_attempts")
    .select("id, started_at, submitted_at, submission_id, superseded_at").eq("id", filters.attempt).eq("user_id", user.id).eq("simulation_id", simulation.id).maybeSingle() : { data: null };
  return <AppShell active="simulations" displayName={user.displayName}><main className="d-main sim-workspace"><div id="dash-tab-simulation">
    {!simulation.is_available&&filters.preview==="1"?<section className="page-screen active"><Link href={`/simulations/${slug}`} className="back-btn">← Quay lại nội dung nhiệm vụ</Link><SubmissionForm simulationId={simulation.id} attemptId={`preview-${user.id}-${simulation.id}`} startedAt="1970-01-01T00:00:00Z" minutes={simulation.estimated_minutes} title={simulation.position_title} industry={simulation.industry} instructions={simulation.task_instructions} materials={materials} timeLimitSpecified={timeLimitSpecified} canSubmit={false} unavailableReason={simulation.unavailable_reason}/></section>:attempt && !attempt.submitted_at ? <section className="page-screen active">{attempt.superseded_at && <div role="status"><p>Đề bài đã cập nhật theo tài liệu mới. Bạn có thể sao chép nội dung bản nháp cũ bên dưới trước khi bắt đầu lại.</p>{simulation.is_available && <form action={startSimulationAction}><input type="hidden" name="simulationId" value={simulation.id}/><button type="submit" className="start-exam-btn">Bắt đầu lượt mới theo đề hiện tại</button></form>}</div>}<SubmissionForm simulationId={simulation.id} attemptId={attempt.id} startedAt={attempt.started_at} minutes={simulation.estimated_minutes} title={simulation.position_title} industry={simulation.industry} instructions={simulation.task_instructions} materials={materials} timeLimitSpecified={timeLimitSpecified} canSubmit={simulation.is_available && !attempt.superseded_at} unavailableReason={attempt.superseded_at ? "Đề bài đã cập nhật. Bản nháp này thuộc lượt cũ và chưa được gửi chấm; hãy bắt đầu lượt mới theo đề hiện tại." : simulation.unavailable_reason}/></section> : attempt?.submission_id ? <section className="page-screen active"><h1 className="page-title">Bài làm đã hoàn thành</h1><Link href={`/simulations/submissions/${attempt.submission_id}`} className="submit-btn">Xem báo cáo kết quả →</Link></section> : <WaitingSimulation title={simulation.position_title} industry={simulation.industry} brief={simulation.brief} instructions={simulation.task_instructions} minutes={simulation.estimated_minutes} rubric={rubric.map(({id,label,weight})=>({id,label,weight}))} available={simulation.is_available} reason={simulation.unavailable_reason} materials={materials} timeLimitSpecified={timeLimitSpecified}>{!simulation.is_available?<Link href={`/simulations/${slug}?preview=1`} className="start-exam-btn">Xem nội dung và soạn thử</Link>:<form action={startSimulationAction}><input type="hidden" name="simulationId" value={simulation.id}/><button type="submit" disabled={!simulation.is_available} className="start-exam-btn">Nhận việc & Bắt đầu tính giờ</button></form>}</WaitingSimulation>}
    </div></main></AppShell>;
}
