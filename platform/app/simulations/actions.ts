"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role-client";
import { revalidatePath } from "next/cache";
import { evaluateSubmissionWithAI, type RubricCriterion } from "@/lib/simulation/ai-evaluator";
import { logger } from "@/lib/observability/logger";

export interface FormState {
  error?: string;
}

/** Starts or resumes an owner-scoped attempt; the database supplies its timestamp. */
export async function startSimulationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const simulationId = String(formData.get("simulationId") ?? "");
  const supabase = await createServerSupabaseClient();
  const { data: simulation } = await supabase.from("simulations").select("id, slug, is_available").eq("id", simulationId).maybeSingle();
  if (!simulation?.is_available) throw new Error("This simulation is not available.");
  const { data: existing } = await supabase.from("simulation_attempts").select("id")
    .eq("user_id", user.id).eq("simulation_id", simulationId).is("submitted_at", null)
    .order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (existing) redirect(`/simulations/${simulation.slug}?attempt=${existing.id}`);
  const { data: attempt, error } = await supabase.from("simulation_attempts")
    .insert({ user_id: user.id, simulation_id: simulationId }).select("id").single();
  if (error || !attempt) throw new Error("Could not start the simulation. Please try again.");
  redirect(`/simulations/${simulation.slug}?attempt=${attempt.id}`);
}

/** Validate ownership, score with objective time, and persist the result atomically. */
export async function submitSimulationAction(
  simulationId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const content = String(formData.get("content") ?? "").trim();
  const attemptId = String(formData.get("attemptId") ?? "");
  const submittedAt = new Date();

  if (content.length === 0) {
    return { error: "Write a response before submitting." };
  }
  if (content.length > 50_000) return { error: "Keep your response under 50,000 characters." };

  const supabase = await createServerSupabaseClient();
  const { data: attempt } = await supabase.from("simulation_attempts")
    .select("id, user_id, simulation_id, started_at, submitted_at, submission_id")
    .eq("id", attemptId).eq("user_id", user.id).maybeSingle();
  if (!attempt || attempt.simulation_id !== simulationId) return { error: "Start your own simulation attempt before submitting." };
  if (attempt.submission_id) redirect(`/simulations/submissions/${attempt.submission_id}`);
  const actualDurationSeconds = Math.floor((submittedAt.getTime() - new Date(attempt.started_at).getTime()) / 1000);
  if (actualDurationSeconds < 0 || !Number.isFinite(actualDurationSeconds)) return { error: "The attempt timer could not be verified. Please refresh." };
  // Verify public availability before reading the private grading rubric.
  const { data: available } = await supabase.from("simulations").select("id, is_available").eq("id", simulationId).maybeSingle();
  if (!available?.is_available) return { error: "This simulation is not currently available." };

  const { data: simulation } = await createServiceRoleClient()
    .from("simulations")
    .select("brief, task_instructions, rubric, grading_rubric, reference_data, min_words")
    .eq("id", simulationId)
    .maybeSingle();

  if (!simulation) {
    return { error: "This simulation could not be found." };
  }

  const rubric = (simulation.grading_rubric ?? simulation.rubric ?? []) as RubricCriterion[];

  let result;
  try {
    result = await evaluateSubmissionWithAI(
      content,
      simulation.brief,
      simulation.task_instructions,
      rubric,
      simulation.min_words,
      { referenceData: simulation.reference_data, actualDurationSeconds },
    );
  } catch (err) {
    logger.error("simulation_evaluation_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: err instanceof Error ? err.message : "UNKNOWN",
    });
    return { error: "Could not score your submission right now. Please try again." };
  }

  const { data: submission, error } = await createServiceRoleClient().rpc("finalize_simulation_attempt", {
    p_attempt_id: attempt.id,
    p_user_id: user.id,
    p_content: content,
    p_overall_score: result.overallScore,
    p_overall_band: result.overallBand,
    p_criterion_scores: { summary: result.summary, criteria: result.criteria },
    p_private_details: result.privateDetails ?? {},
    p_submitted_at: submittedAt.toISOString(),
  });

  if (error || !submission) {
    logger.error("simulation_submit_failed", {
      operation: "submitSimulationAction",
      domain: "simulations",
      error_code: error?.code ?? "UNKNOWN",
    });
    return { error: "Something went wrong submitting your work. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/report");
  redirect(`/simulations/submissions/${submission}`);
}
