import { expect, test } from "vitest";
import bank from "@/data/interview-bank.json";
import { evaluateInterviewWithAI } from "@/lib/interview/ai-evaluator";

const cases = [
  ["business-analyst", "2", 1, "Tôi dùng phỏng vấn 1-1 để đào sâu nghiệp vụ với chuyên gia hoặc trao đổi chủ đề nhạy cảm. Khi nhiều stakeholder có quan điểm khác nhau, tôi tổ chức workshop để thống nhất yêu cầu, tránh mâu thuẫn và tiết kiệm thời gian. Đây là hai kỹ thuật requirement elicitation tôi chọn theo mục tiêu buổi làm việc."],
  ["ke-toan-vien", "1", 2, "Kế toán tiếp nhận và kiểm tra hóa đơn, chứng từ; nhập liệu và hạch toán nghiệp vụ phát sinh vào tài khoản phù hợp. Sau đó đối chiếu số liệu giữa chứng từ, sổ kế toán, ngân hàng và công nợ để tìm và xử lý chênh lệch trước khi tổng hợp báo cáo."],
  ["tro-ly-thue", "2", 2, "Tôi đối chiếu số lượng, số hóa đơn, ngày lập, giá trị trước thuế, thuế GTGT và tổng tiền. Tôi kiểm tra công thức bảng tổng hợp, lỗi nhập liệu, hóa đơn thiếu hoặc trùng và đối chiếu chứng từ liên quan. Tôi xác định nguyên nhân chênh lệch, báo cáo người phụ trách và đề xuất điều chỉnh theo quy định trước khi kê khai."],
  ["credit-analyst", "3", 1, "Tôi làm rõ lý do khẩn cấp, thời hạn và danh mục thông tin tài chính còn thiếu. Tôi không bỏ qua thẩm định thiết yếu và đề nghị kiểm soát chéo theo quy trình. Tôi yêu cầu bổ sung nhanh thông tin, trình phương án giảm hạn mức hoặc giải ngân từng đợt nếu đáp ứng điều kiện phê duyệt; mọi quyết định phải được người có thẩm quyền xem xét. Tôi ghi nhận điều kiện tín dụng và nguồn trả nợ để giám sát."],
  ["financial-analyst", "3", 1, "Tôi kiểm chứng dữ liệu, công thức và giả định, rồi hỏi sếp về lý do chiến lược muốn tiếp tục. Với dự án giả định, tôi trình bày mức lỗ, thời gian hoàn vốn và điều kiện đạt điểm hòa vốn. Tôi so sánh ba phương án: thu hẹp quy mô với trần lỗ ngân sách, thử nghiệm theo giai đoạn với mốc dòng tiền, hoặc tạm dừng để điều chỉnh mô hình với thời hạn đánh giá lại. Chỉ số cắt lỗ và quyết định tiếp tục phải được phê duyệt rõ ràng."],
  ["logistics-ops", "2", 0, "Quy trình order fulfillment gồm tiếp nhận yêu cầu, kiểm tra tồn kho và chứng từ, điều phối kho và xe bốc xếp, theo dõi hành trình rồi xác nhận giao hàng bằng POD. Tôi không cho xuất hàng khi chứng từ lệch và chỉ đánh dấu hoàn tất khi có proof of delivery. Tôi theo dõi các mốc dispatch và tracking theo SOP."],
  ["supply-chain", "2", 0, "Bullwhip effect là biến động nhu cầu bị khuếch đại từ điểm bán lên đại lý và nhà máy do phản ứng hoảng loạn ngắn hạn, dự báo từ đơn đặt hàng và thiếu chia sẻ dữ liệu. Tôi đề xuất chia sẻ POS data và tồn kho thực tế toàn chuỗi để dự báo, phối hợp qua VMI hoặc CPFR thay vì cùng tăng đặt hàng theo tín hiệu ảo."],
  ["purchasing", "2", 0, "Tôi tiếp nhận PR, tìm nguồn, gửi RFQ và so sánh báo giá trong cost comparison matrix. Sau đó phối hợp kiểm tra mẫu, đàm phán, trình duyệt và phát hành PO hoặc ký hợp đồng. Đơn vượt hạn mức, ví dụ trên 100 triệu theo SOP giả định, phải xin phê duyệt Trưởng phòng trước khi phát hành; không tự ý cam kết với nhà cung cấp."],
  ["kiem-toan-vien", "2", 2, "Tôi tìm hiểu bản chất khoản mục, nguồn gốc phát sinh, quy trình ghi nhận và hồ sơ liên quan. Tôi phân tích biến động so với kỳ trước, kế hoạch và các khoản mục tương ứng, rồi làm rõ chênh lệch bất thường. Tôi đánh giá khả năng ghi nhận sai, thiếu chứng từ, định giá sai hoặc gian lận để lựa chọn thủ tục kiểm tra phù hợp."],
] as const;
type SetSource = { grading_ready: boolean; rounds: Record<string, { questions: { id: string; questionText: string; referenceAnswer: string; scoringCriteria: { id: string; name: string; description: string; maxScore: number }[] }[] }> };
const sets = bank as unknown as Record<string, SetSource>;

// Run sequentially and explicitly opt in. Synthetic text only, no sessions or
// account data, no database writes, and no raw provider response logging.
for (const [slug, round, index, answer] of cases) {
  test.skipIf(process.env.R2W_RUN_LIVE_INTERVIEW_REFRESH !== "1" || process.env.R2W_INTERVIEW_REFRESH_CASE === "negative")(`grades reviewed ${slug} with its own source rubric`, async () => {
    expect(sets[slug]!.grading_ready).toBe(true);
    const question = sets[slug]!.rounds[round]!.questions[index]!;
    const rubric = question.scoringCriteria.map(c => ({ id: c.id, label: c.name, description: c.description, weight: c.maxScore, maxScore: c.maxScore }));
    const started = Date.now();
    try {
      const result = await evaluateInterviewWithAI(answer, question.questionText, question.referenceAnswer, rubric);
      console.info(JSON.stringify({ check: "reviewed-interview-result", slug, normalizedScore: result.score, criterionCount: result.criteria.length,
        exactIds: JSON.stringify(result.criteria.map(c => c.criterionId)) === JSON.stringify(rubric.map(c => c.id)) }));
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.criteria.map(c => c.criterionId)).toEqual(rubric.map(c => c.id));
      expect(result.criteria.every(c => c.score >= 0 && c.score <= c.maxScore)).toBe(true);
      console.info(JSON.stringify({ check: "reviewed-interview-grading", slug, questionId: question.id, criteria: result.criteria.length, validated: true, duration_ms: Date.now()-started, databaseWrites: 0 }));
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? error.status : "validation_or_network";
      const kind = error instanceof Error && ["InterviewEvaluationError", "SyntaxError", "ZodError", "AbortError", "TimeoutError", "AssertionError"].includes(error.name) ? error.name : "UNKNOWN";
      const code = error instanceof Error && "code" in error && ["INVALID_IDS", "EXCESS_POINTS"].includes(String(error.code)) ? error.code : kind;
      throw new Error(`Reviewed interview check failed (${slug}, ${status}, ${code}); no account data was saved.`);
    }
  }, 60_000);
}

test.skipIf(process.env.R2W_RUN_LIVE_INTERVIEW_REFRESH !== "1")("does not award a high score to an unrelated synthetic answer", async () => {
  const question = sets["business-analyst"]!.rounds["2"]!.questions[1]!;
  const rubric = question.scoringCriteria.map(c => ({ id: c.id, label: c.name, description: c.description, weight: c.maxScore, maxScore: c.maxScore }));
  const result = await evaluateInterviewWithAI("Tôi thích ăn kem và nghe nhạc. Tôi không biết cách trả lời câu hỏi nghiệp vụ này.", question.questionText, question.referenceAnswer, rubric);
  expect(result.criteria).toHaveLength(rubric.length);
  expect(result.score).toBeLessThanOrEqual(25);
  console.info(JSON.stringify({ check: "unrelated-interview-answer", normalizedScore: result.score, validated: true, databaseWrites: 0 }));
}, 60_000);
