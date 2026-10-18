"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CareerForRoadmap } from "@/lib/roadmap/generator";
import { generateRoadmapSteps } from "@/lib/roadmap/ai-planner";
import { replyToRoadmapChat, type RoadmapChatMessage } from "@/lib/roadmap/chat";
import { logger } from "@/lib/observability/logger";

/** Generates a roadmap for a career, or returns the existing one. */
export async function generateRoadmapAction(careerId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();

  const [{ data: existing }, { data: career }] = await Promise.all([supabase
    .from("roadmaps")
    .select("id")
    .eq("user_id", user.id)
    .eq("career_id", careerId)
    .maybeSingle(),
    supabase.from("careers").select("title, industry, key_skills, entry_roles").eq("id", careerId).maybeSingle(),
  ]);

  if (existing) {
    redirect(`/roadmap/${existing.id}`);
  }

  if (!career) {
    throw new Error("That career could not be found.");
  }

  let steps;
  try {
    steps = await generateRoadmapSteps(career as CareerForRoadmap);
  } catch {
    throw new Error("Could not generate your roadmap right now. Please try again.");
  }

  const { data: roadmap, error } = await supabase
    .from("roadmaps")
    .insert({ user_id: user.id, career_id: careerId })
    .select("id")
    .single();

  if (error || !roadmap) {
    throw new Error("Could not create your roadmap. Please try again.");
  }

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

/** Form-compatible entry point used by the client-side roadmap planner. */
export async function generateRoadmapFromFormAction(formData: FormData): Promise<void> {
  const careerId = formData.get("careerId");
  if (typeof careerId !== "string" || careerId.length === 0) {
    throw new Error("Choose a career before generating your roadmap.");
  }
  await generateRoadmapAction(careerId);
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

export interface ChatFormState {
  error?: string;
}

export interface PlanningChatFormState {
  messages: RoadmapChatMessage[];
  error?: string;
}

/**
 * Career coaching before a roadmap exists. The conversation is intentionally
 * ephemeral; once the roadmap is generated, its grounded chat is persisted.
 */
export async function sendPlanningChatMessageAction(
  previous: PlanningChatFormState,
  formData: FormData,
): Promise<PlanningChatFormState> {
  await requireUser();
  const careerId = String(formData.get("careerId") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!careerId) {
    return { messages: previous.messages, error: "Choose a career first." };
  }
  if (!message) {
    return { messages: previous.messages, error: "Write a message before sending." };
  }
  if (message.length > 2_000) {
    return { messages: previous.messages, error: "Keep your message under 2,000 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: career } = await supabase
    .from("careers")
    .select("title, industry, key_skills")
    .eq("id", careerId)
    .maybeSingle();

  if (!career) {
    return { messages: previous.messages, error: "That career could not be found." };
  }

  const safePreviousMessages = previous.messages
    .slice(-10)
    .filter((entry) => entry.role === "user" || entry.role === "assistant")
    .map((entry) => ({
      role: entry.role,
      content: String(entry.content).slice(0, 4_000),
    }));

  const history: RoadmapChatMessage[] = [
    ...safePreviousMessages,
    { role: "user", content: message },
  ];

  try {
    const reply = await replyToRoadmapChat(career, [], history);
    return {
      messages: [...history, { role: "assistant", content: reply }],
    };
  } catch (err) {
    logger.error("roadmap_planning_chat_failed", {
      operation: "sendPlanningChatMessageAction",
      domain: "roadmap",
      error_code: err instanceof Error ? err.message : "UNKNOWN",
    });
    return {
      messages: previous.messages,
      error: "Could not get a reply right now. Please try again.",
    };
  }
}

/** Sends a chat message about the roadmap and stores the AI's reply. */
export async function sendRoadmapChatMessageAction(
  roadmapId: string,
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  const user = await requireUser();
  const message = String(formData.get("message") ?? "").trim();
  if (message.length === 0) {
    return { error: "Write a message before sending." };
  }
  if (message.length > 2_000) return { error: "Keep your message under 2,000 characters." };

  const supabase = await createServerSupabaseClient();

  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("id, user_id, careers (title, industry, key_skills)")
    .eq("id", roadmapId)
    .maybeSingle();

  if (!roadmap || roadmap.user_id !== user.id) {
    return { error: "That roadmap could not be found." };
  }

  const career = roadmap.careers as unknown as {
    title: string;
    industry: string;
    key_skills: string[];
  };

  const [{ data: steps }, { data: priorMessages }] = await Promise.all([
    supabase
      .from("roadmap_steps")
      .select("stage, title, objective, completed")
      .eq("roadmap_id", roadmapId)
      .order("position"),
    supabase
      .from("roadmap_chat_messages")
      .select("role, content")
      .eq("roadmap_id", roadmapId)
      .order("created_at", { ascending: false })
      // Each saved user/assistant pair shares a transaction timestamp.
      .order("role", { ascending: true })
      .limit(10),
  ]);

  const history: RoadmapChatMessage[] = [
    ...(priorMessages ?? []).reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  let reply: string;
  try {
    reply = await replyToRoadmapChat(career, steps ?? [], history);
  } catch (err) {
    logger.error("roadmap_chat_failed", {
      operation: "sendRoadmapChatMessageAction",
      domain: "roadmap",
      error_code: err instanceof Error ? err.message : "UNKNOWN",
    });
    return { error: "Could not get a reply right now. Please try again." };
  }

  const { error } = await supabase.from("roadmap_chat_messages").insert([
    { roadmap_id: roadmapId, role: "user", content: message },
    { roadmap_id: roadmapId, role: "assistant", content: reply },
  ]);

  if (error) {
    logger.error("roadmap_chat_save_failed", {
      operation: "sendRoadmapChatMessageAction",
      domain: "roadmap",
      error_code: error.code,
    });
    return { error: "Your message could not be saved. Please try again." };
  }

  revalidatePath(`/roadmap/${roadmapId}`);
  return {};
}
