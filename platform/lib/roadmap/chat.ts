import "server-only";
import { generateChatReply, type ChatTurn } from "@/lib/ai/gemini";

export interface RoadmapChatCareer {
  title: string;
  industry: string;
  key_skills: string[];
}

export interface RoadmapStepSummary {
  stage: string;
  title: string;
  objective: string;
  completed: boolean;
}

export interface RoadmapChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemContext(career: RoadmapChatCareer, steps: RoadmapStepSummary[]): string {
  const stepList = steps
    .map(
      (step, index) =>
        `${index + 1}. [${step.stage}] ${step.title} - ${step.objective}${step.completed ? " (completed)" : ""}`,
    )
    .join("\n");

  return [
    "You are a career coach helping a student follow their personalized roadmap toward a target career.",
    `Target career: ${career.title} (${career.industry}).`,
    `Key skills for this career: ${career.key_skills.join(", ")}.`,
    "The user's current roadmap steps are:",
    stepList,
    "",
    "Answer questions about the roadmap, explain why a step matters, suggest how to approach a step, or give general career-preparation advice.",
    "Keep replies concise (a few sentences, or a short list). Do not invent facts about the user beyond what is given here.",
    "Make clear this is coaching advice, not a guarantee of employment, if relevant.",
  ].join("\n");
}

/**
 * Replies to a roadmap chat message, grounded in the user's career and
 * current checklist so the AI cannot drift into unrelated advice.
 */
export async function replyToRoadmapChat(
  career: RoadmapChatCareer,
  steps: RoadmapStepSummary[],
  history: RoadmapChatMessage[],
): Promise<string> {
  const systemContext = buildSystemContext(career, steps);
  const turns: ChatTurn[] = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    text: message.content,
  }));

  return generateChatReply(systemContext, turns);
}
