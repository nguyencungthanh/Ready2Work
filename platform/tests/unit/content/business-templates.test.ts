import { describe, expect, it } from "vitest";
import { rubricSchema, interviewRubricSchema, interviewAssignmentSchema } from "@/lib/content/business-schema";
import simulationRubric from "@/public/templates/simulation-rubric.json";
import interviewRubric from "@/public/templates/interview-rubric.json";
import interviewAssignment from "@/public/templates/interview-assignment.json";

describe("downloadable employer templates", () => {
  it("accepts each generated template using the real upload schemas", () => {
    expect(rubricSchema.safeParse(simulationRubric).success).toBe(true);
    expect(interviewRubricSchema.safeParse(interviewRubric).success).toBe(true);
    expect(interviewAssignmentSchema.safeParse(interviewAssignment).success).toBe(true);
  });
  it("provides exactly one matching rubric for every assignment question", () => {
    const expected = interviewAssignment.rounds.flatMap((round) => round.questions.map((_, index) => `${round.roundNumber}-${index + 1}`));
    expect(interviewRubric.map((item) => `${item.roundNumber}-${item.questionIndex}`).sort()).toEqual(expected.sort());
  });
});
