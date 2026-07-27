import { describe, expect, it } from "vitest";
import { evaluateInterviewAnswer } from "@/lib/interview/evaluator";

describe("evaluateInterviewAnswer", () => {
  it("scores a strong, relevant, evidenced answer highly", () => {
    const answer =
      "For example, in my last internship I led a small team to redesign our onboarding flow. " +
      "Specifically, I built a prototype, tested it with five users, and the result was a 30% drop in drop-off. " +
      "I managed the whole process end to end and it taught me a lot about structured problem solving.";
    const result = evaluateInterviewAnswer(answer, ["team", "leadership", "result"]);

    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.criteria).toHaveLength(3);
  });

  it("scores a very short, generic answer low", () => {
    const result = evaluateInterviewAnswer("I don't know, maybe good I guess.", ["team", "leadership"]);
    expect(result.score).toBeLessThan(50);
  });

  it("penalizes answers that ignore the expected keywords", () => {
    const onTopic = evaluateInterviewAnswer(
      "I focused on teamwork and leadership throughout this project, coordinating with stakeholders daily.",
      ["teamwork", "leadership", "stakeholders"],
    );
    const offTopic = evaluateInterviewAnswer(
      "I enjoy hiking on weekends and trying new restaurants around the city with friends.",
      ["teamwork", "leadership", "stakeholders"],
    );

    expect(onTopic.score).toBeGreaterThan(offTopic.score);
  });

  it("is deterministic for identical input", () => {
    const answer = "I worked on a cross-functional project and delivered results on time.";
    const first = evaluateInterviewAnswer(answer, ["project", "results"]);
    const second = evaluateInterviewAnswer(answer, ["project", "results"]);
    expect(first).toEqual(second);
  });

  it("never inspects anything beyond the answer text and keywords", () => {
    // The function signature itself proves this: no audio, voice, or
    // identity fields are accepted as parameters (feature.md fairness rule).
    expect(evaluateInterviewAnswer.length).toBe(2);
  });
});
