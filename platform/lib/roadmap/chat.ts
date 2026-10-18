import "server-only";
import { generateChatReply, type ChatTurn } from "@/lib/ai/gemini";
import { assistantRequestHistory } from "@/lib/assistant/limits";

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

  const roadmapContext =
    steps.length > 0
      ? [
          "The user's current roadmap steps are:",
          stepList,
          "",
          "Answer questions about the roadmap, explain why a step matters, suggest how to approach a step, or give general career-preparation advice.",
        ]
      : [
          "The user has not generated their roadmap yet.",
          "Help them understand this career, decide what to prioritize, and ask useful questions before creating a roadmap.",
        ];

  return [
    "You are a career coach helping a student follow their personalized roadmap toward a target career.",
    `Target career: ${career.title} (${career.industry}).`,
    `Key skills for this career: ${career.key_skills.join(", ")}.`,
    ...roadmapContext,
    "Keep replies concise (a few sentences, or a short list). Do not invent facts about the user beyond what is given here.",
    "Format the answer for direct display: preserve intentional line breaks and use '- ' bullets for lists. Do not wrap the answer in a code block.",
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

  const question = turns.at(-1);
  if (!question || question.role !== "user") throw new Error("Chat history must end with a user turn.");
  return generateChatReply(systemContext, assistantRequestHistory(turns.slice(0, -1), question.text), { maxOutputTokens: 1200 });
}
