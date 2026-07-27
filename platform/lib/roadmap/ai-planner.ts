import "server-only";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/gemini";
import { ROADMAP_STAGES, type CareerForRoadmap, type RoadmapStepTemplate } from "./generator";

// The AI is not allowed to invent arbitrary links - only these in-app routes.
const ALLOWED_RESOURCE_URLS = ["/simulations", "/interviews"] as const;

const stepSchema = z.object({
  stage: z.enum(ROADMAP_STAGES),
  title: z.string().min(3).max(120),
  objective: z.string().min(10).max(400),
  resourceUrl: z.string().nullable().optional(),
});

const planSchema = z.object({
  steps: z.array(stepSchema).min(6).max(12),
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          stage: { type: "string", enum: ROADMAP_STAGES as unknown as string[] },
          title: { type: "string" },
          objective: { type: "string" },
          resourceUrl: { type: "string", nullable: true },
        },
        required: ["stage", "title", "objective"],
      },
    },
  },
  required: ["steps"],
};

function buildPrompt(career: CareerForRoadmap): string {
  return `You are a career coach creating a personalized development roadmap for a student targeting the role "${career.title}" in the "${career.industry}" industry.

Key skills for this role: ${career.key_skills.join(", ") || "none listed"}.
Typical entry roles: ${career.entry_roles.join(", ") || career.title}.

Generate 7-10 concrete, actionable roadmap steps covering these stages in order: ${ROADMAP_STAGES.join(", ")}.

Rules:
- Each step needs a short "title" and a concrete "objective" (what to actually do, one or two sentences).
- Use plain, encouraging language aimed at a student early in their career.
- Include at least one step in the "Simulate work" stage with resourceUrl set to "/simulations", and at least one step in "Practice interviews" with resourceUrl set to "/interviews".
- For every other step, omit resourceUrl or set it to null - do not invent URLs.
- Every step's "stage" must be exactly one of: ${ROADMAP_STAGES.join(", ")}.
- Return steps in a sensible progression through the stages.`;
}

/**
 * Generates a personalized roadmap via Gemini. Replaces the old rule-based
 * generator (plan section 12.3 allowed either path; this project has opted
 * for full AI generation). Output is schema-validated and resource URLs are
 * clamped to an allow-list before anything reaches the database - the AI is
 * treated as untrusted input (plan section 19.5).
 */
export async function generateRoadmapSteps(
  career: CareerForRoadmap,
): Promise<RoadmapStepTemplate[]> {
  const prompt = buildPrompt(career);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generateStructured(prompt, RESPONSE_SCHEMA);
      const parsed = planSchema.parse(raw);

      return parsed.steps.map((step) => ({
        stage: step.stage,
        title: step.title,
        objective: step.objective,
        resourceUrl:
          step.resourceUrl && ALLOWED_RESOURCE_URLS.includes(step.resourceUrl as never)
            ? step.resourceUrl
            : undefined,
        resourceLabel: step.resourceUrl === "/simulations"
          ? "Go to Job Simulation"
          : step.resourceUrl === "/interviews"
            ? "Go to Interview Practice"
            : undefined,
      }));
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Could not generate a roadmap from the AI. ${
      lastError instanceof Error ? lastError.message : "Unknown error."
    }`,
  );
}
