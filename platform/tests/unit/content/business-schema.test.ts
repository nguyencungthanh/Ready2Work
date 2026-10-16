import { describe, expect, it } from "vitest";
import { rubricSchema, interviewAssignmentSchema, interviewRubricSchema } from "@/lib/content/business-schema";
import rubric from "@/public/templates/simulation-rubric.json";
import assignment from "@/public/templates/interview-assignment.json";
import interviewRubric from "@/public/templates/interview-rubric.json";

describe("employer document schemas", () => {
  it("rejects duplicate rubric IDs even when weights still total 100", () => {
    expect(rubricSchema.safeParse([{ ...rubric[0], weight: 50 }, { ...rubric[0], weight: 50 }]).success).toBe(false);
  });
  it("requires positive, bounded criterion weights and a complete 100-point rubric", () => {
    expect(rubricSchema.safeParse([{ ...rubric[0], weight: 0 }, rubric[1]]).success).toBe(false);
    expect(rubricSchema.safeParse([{ ...rubric[0], weight: 101 }]).success).toBe(false);
    expect(rubricSchema.safeParse([{ ...rubric[0], weight: 99 }]).success).toBe(false);
  });
  it("requires three distinct nonempty interview rounds", () => {
    const duplicate = structuredClone(assignment); duplicate.rounds[1]!.roundNumber = 1;
    expect(interviewAssignmentSchema.safeParse(duplicate).success).toBe(false);
    const empty = structuredClone(assignment); empty.rounds[0]!.questions = [];
    expect(interviewAssignmentSchema.safeParse(empty).success).toBe(false);
    expect(interviewAssignmentSchema.safeParse({ rounds: assignment.rounds.slice(0, 2) }).success).toBe(false);
  });
  it("rejects duplicate round/question rubric pairs", () => {
    expect(interviewRubricSchema.safeParse([...interviewRubric, interviewRubric[0]]).success).toBe(false);
  });
});
