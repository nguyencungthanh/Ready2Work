"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildRoadmap, type CareerForRoadmap } from "@/lib/roadmap/generator";

/** Generates a roadmap for a career, or returns the existing one. */
export async function generateRoadmapAction(careerId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const { data: existing } = await supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", user.id)
    .eq("career_id", careerId)
    .maybeSingle();

  if (existing) {
    redirect(`/roadmap/${existing.id}`);
  }

  const { data: career } = await supabase
    .from("careers")
    .select("title, industry, key_skills, entry_roles")
    .eq("id", careerId)
    .maybeSingle();

  if (!career) {
    throw new Error("That career could not be found.");
  }

  const { data: roadmap, error } = await supabase
    .from("roadmaps")
    .insert({ user_id: user.id, career_id: careerId })
    .select("id")
    .single();

  if (error || !roadmap) {
    throw new Error("Could not create your roadmap. Please try again.");
  }

  const steps = buildRoadmap(career as CareerForRoadmap);
  await supabase.from("roadmap_steps").insert(
    steps.map((step, index) => ({
      roadmap_id: roadmap.id,
      position: index + 1,
      stage: step.stage,
      title: step.title,
      objective: step.objective,
      resource_label: step.resourceLabel ?? null,
      resource_url: step.resourceUrl ?? null,
    })),
  );

  redirect(`/roadmap/${roadmap.id}`);
}

/** Marks a step complete or incomplete (the "Update Progress" button). */
export async function toggleStepAction(stepId: string, completed: boolean): Promise<void> {
  await requireUser();
  const supabase = await createServerSupabaseClient();

  await supabase
    .from("roadmap_steps")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", stepId);

  revalidatePath("/roadmap", "layout");
}
