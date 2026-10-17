import { expect, test } from "vitest";
import bank from "@/data/interview-bank.json";
import { evaluateInterviewWithAI } from "@/lib/interview/ai-evaluator";

test.skipIf(process.env.R2W_RUN_LIVE_INTERVIEW !== "1")("evaluates approved project questions with synthetic answers without saving user data", async () => {
  const cases = [
    { question: bank["qa-tester"].rounds["1"].questions[1]!, answer: "Reactive/Proactive, Quality Assurance/Quality Control." },
    { question: bank["financial-analyst"].rounds["1"].questions[0]!, answer: "Tôi có nền tảng học tài chính và đã thực hiện bài tập đọc báo cáo kết quả kinh doanh, bảng cân đối và dòng tiền. Tôi chọn phân tích tài chính vì muốn giải thích hiệu quả kinh doanh bằng số liệu và hỗ trợ quyết định ngân sách. Trong bài tập nhóm, tôi đối chiếu dữ liệu cẩn thận và trình bày kết luận theo thứ tự chỉ số, nguyên nhân và khuyến nghị." },
  ];
  for (const { question, answer } of cases) {
    try {
      const rubric = question.scoringCriteria.map((criterion) => ({ id: criterion.id, label: criterion.name, description: criterion.description, weight: criterion.maxScore, maxScore: criterion.maxScore }));
      const result = await evaluateInterviewWithAI(answer, question.questionText, question.referenceAnswer, rubric);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.criteria).toHaveLength(rubric.length);
      expect(result.criteria.every((criterion) => criterion.score <= criterion.maxScore)).toBe(true);
      console.info(JSON.stringify({ questionId: question.id, provider: "gemini", criteria: result.criteria.length, validated: true }));
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : "validation_or_network";
      throw new Error(`Live Gemini check stopped (${status}); no account data was saved.`);
    }
  }
}, 90_000);
