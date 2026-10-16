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
  return <AppShell active="simulations" displayName={user.displayName}><main className="d-main sim-workspace"><div id="dash-tab-simulation">
    {attempt && !attempt.submitted_at ? <section className="page-screen active"><SubmissionForm simulationId={simulation.id} attemptId={attempt.id} startedAt={attempt.started_at} minutes={simulation.estimated_minutes} title={simulation.position_title} industry={simulation.industry} instructions={simulation.task_instructions}/></section> : attempt?.submission_id ? <section className="page-screen active"><h1 className="page-title">Bài làm đã hoàn thành</h1><Link href={`/simulations/submissions/${attempt.submission_id}`} className="submit-btn">Xem báo cáo kết quả →</Link></section> : <WaitingSimulation title={simulation.position_title} industry={simulation.industry} brief={simulation.brief} instructions={simulation.task_instructions} minutes={simulation.estimated_minutes} rubric={rubric.map(({id,label,weight})=>({id,label,weight}))} available={simulation.is_available} reason={simulation.unavailable_reason}><form action={startSimulationAction}><input type="hidden" name="simulationId" value={simulation.id}/><button type="submit" disabled={!simulation.is_available} className="start-exam-btn">Nhận việc & Bắt đầu tính giờ</button></form></WaitingSimulation>}
    </div></main></AppShell>;
}
