import { describe, expect, it } from "vitest";
import { summarizeInterview } from "@/lib/interview/progress";
const questions = [
  { id: "a", round_number: 1, max_score: 30 },
  { id: "b", round_number: 1, max_score: 70 },
  { id: "c", round_number: 2, max_score: 20 },
  { id: "d", round_number: 3, max_score: 40 },
];
const answers = [{ question_id: "a", score: 100 }, { question_id: "b", score: 0 }, { question_id: "c", score: 50 }, { question_id: "d", score: 100 }];
describe("three-round interview summary", () => {
  it("normalizes unequal source question maxima and equally weights the three rounds", () => {
    const summary = summarizeInterview(questions, answers);
    expect(summary.roundScores.map((round) => round.score)).toEqual([30, 50, 100]);
    expect(summary.overallScore).toBe(60);
    expect(summary.hasThreeRounds).toBe(true);
  });
  it("rejects answers to another set even if their count matches", () => {
    expect(() => summarizeInterview(questions, answers.map((answer, index) => index === 0 ? { ...answer, question_id: "foreign" } : answer))).toThrow();
  });
  it("rejects duplicate answers, empty interviews and unscored questions", () => {
    expect(() => summarizeInterview([], [])).toThrow();
    expect(() => summarizeInterview(questions, [...answers.slice(0, 3), answers[0]!])).toThrow();
    expect(() => summarizeInterview(questions, answers.map((answer) => ({ ...answer, score: null })))).toThrow();
  });
  it("does not count a source missing a round as a complete three-round interview", () => {
    expect(summarizeInterview(questions.slice(0, 3), answers.slice(0, 3)).hasThreeRounds).toBe(false);
  });
});
