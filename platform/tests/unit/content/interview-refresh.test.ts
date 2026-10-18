import { describe, expect, it } from "vitest";
import bank from "@/data/interview-bank.json";
import snapshot from "@/data/source/interviews-20261019.json";
import { validateInterviewEvaluation } from "@/lib/interview/ai-evaluator";
import { summarizeInterview } from "@/lib/interview/progress";
import { sourceInterviewSlugs } from "@/lib/content/interview-catalog";
type ReviewedSet = { grading_ready: boolean; source_conflicts: unknown[]; rounds: Record<string, { questions: {
  id: string; maxScore: number; scoringCriteria: { id: string; name: string; description: string; maxScore: number }[];
}[] }> };

describe("reviewed interview completion", () => {
  it("covers all five source tabs and makes every current set gradeable", () => {
    expect(new Set(Object.values(snapshot.sets).map(set => set.tab_id)).size).toBe(5);
    expect(sourceInterviewSlugs().filter(slug => slug.endsWith("-20261019"))).toHaveLength(9);
    expect(sourceInterviewSlugs().filter(slug => slug.endsWith("-20261017"))).toHaveLength(6);
    for (const set of Object.values(bank as unknown as Record<string, ReviewedSet>)) {
      expect(set.grading_ready).toBe(true);
      expect(set.source_conflicts).toEqual([]);
      for (const round of Object.values(set.rounds)) {
        expect(round.questions.reduce((sum, q) => sum+q.maxScore, 0)).toBe(100);
        for (const q of round.questions) {
          const rubric = q.scoringCriteria.map(c => ({ id: c.id, label: c.name, description: c.description, weight: c.maxScore, maxScore: c.maxScore }));
          const result = validateInterviewEvaluation({ criteria: rubric.map(c => ({ id: c.id, score: c.maxScore/2, note: "Câu trả lời đáp ứng một phần tiêu chí." })) }, rubric);
          expect(result.score, q.id).toBe(50);
          expect(result.criteria).toHaveLength(rubric.length);
        }
      }
    }
  });

  it("uses the corrected tax prompts and explicit 12-point accounting criterion", () => {
    const tax = bank["tro-ly-thue"];
    expect(tax.rounds["1"].questions[2]!.questionText).toContain("cập nhật các quy định thuế");
    expect(tax.rounds["2"].questions[0]!.questionText).toContain("kiểm tra hóa đơn và đối chiếu chứng từ");
    expect(tax.rounds["2"].questions[2]!.questionText).toContain("doanh thu giữa hóa đơn và bảng tổng hợp");
    expect(bank["ke-toan-vien"].rounds["1"].questions[2]!.scoringCriteria[1]!.maxScore).toBe(12);
    expect(bank["kiem-toan-vien"].rounds["2"].questions[2]!.scoringCriteria[1]!.description).toContain("Phân tích biến động");
  });

  it("normalizes BA's 35 raw criterion points with the source question weight 30 exactly once", () => {
    const question = bank["business-analyst"].rounds["2"].questions[1]!;
    expect(question.scoreNormalization).toBe("criterion_total_to_question_maximum");
    expect(question.maxScore).toBe(30);
    expect(question.scoringCriteria.map(c => c.maxScore)).toEqual([15, 12, 8]);
    const rubric = question.scoringCriteria.map(c => ({ id: c.id, label: c.name, description: c.description, weight: c.maxScore, maxScore: c.maxScore }));
    const result = validateInterviewEvaluation({ criteria: rubric.map(c => ({ id: c.id, score: c.maxScore, note: "Đủ bằng chứng theo tiêu chí." })) }, rubric);
    expect(result.score).toBe(100);
    const questions = Object.values(bank["business-analyst"].rounds).flatMap(r => r.questions.map(q => ({ id: q.id, round_number: r.roundNumber, max_score: q.maxScore })));
    const summary = summarizeInterview(questions, questions.map(q => ({ question_id: q.id, score: q.id === question.id ? result.score : 0 })));
    expect(summary.roundScores.find(round => round.round === 2)?.score).toBe(30);
    expect(summary.overallScore).toBe(10);
  });
});
