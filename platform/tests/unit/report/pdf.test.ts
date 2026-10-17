import { describe, expect, it } from "vitest";
import { extractText, getDocumentProxy } from "unpdf";
import { mkdir, writeFile } from "node:fs/promises";
import { renderReportPdf, type ReportPdfData } from "@/lib/report/pdf";
import { calculateReadiness } from "@/lib/report/scoring";

const identity = { displayName: "Nguyễn Thị Ánh", email: "qa@example.test" };
const date = new Date("2026-10-17T03:00:00Z");
function fixture(): ReportPdfData {
  return {
    target: { id: "IT-03", title: "Data Analyst" }, readiness: calculateReadiness(100, 75, 80), completion: 100,
    targetSimulations: [{ id: "task", slug: "qa-task", title: "Phân tích dữ liệu và đề xuất giải pháp", industry: "IT", position_id: "IT-03", position_title: "Data Analyst" }],
    targetSubmissions: [{ id: "submission", simulation_id: "task", overall_score: 85, submitted_at: date.toISOString(), criterion_scores: null }],
    completedInterview: { id: "session", set_id: "set", created_at: date.toISOString(), completed_at: date.toISOString(), overall_score: 75, round_scores: [1, 2, 3].map((round) => ({ round, score: 75, questionCount: 1 })) },
    measuredSkills: ["SQL", "Phân tích dữ liệu", "Trình bày", "Giải quyết vấn đề", "Kiểm tra dữ liệu", "Đề xuất hành động"].map((label, i) => ({ label, score: 60 + i * 5, notes: [] })),
    strengths: ["Có bằng chứng về SQL và tư duy phân tích từ bài mô phỏng đã được chấm."],
    gaps: ["Cần bổ sung số liệu để làm rõ tác động của giải pháp."], cv: null,
  };
}
async function inspect(data: ReportPdfData, name: string) {
  const buffer = await renderReportPdf(identity, data, date);
  if (process.env.R2W_PDF_QA_DIR) {
    await mkdir(process.env.R2W_PDF_QA_DIR, { recursive: true });
    await writeFile(`${process.env.R2W_PDF_QA_DIR}/${name}.pdf`, buffer);
  }
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  try { return await extractText(pdf, { mergePages: true }); }
  finally { await pdf.loadingTask.destroy(); }
}

describe("report PDF rendering", () => {
  it("embeds Vietnamese text, actual scores and all three report blocks", async () => {
    const result = await inspect(fixture(), "complete");
    expect(result.text).toContain(identity.displayName);
    expect(result.text).toContain("Phân tích dữ liệu và đề xuất giải pháp");
    expect(result.text).toContain("85/100");
    expect(result.text).toContain("Điểm mạnh nổi bật");
    expect(result.text).toContain("Hành động tiếp theo");
    expect(result.text).toContain("Chưa có dữ liệu ứng viên trúng tuyển");
  });
  it("keeps missing evidence explicit rather than manufacturing a readiness score", async () => {
    const data = { ...fixture(), target: null, readiness: calculateReadiness(null, null, null), completion: null, targetSimulations: [], targetSubmissions: [], completedInterview: undefined, measuredSkills: [], strengths: [], gaps: [] };
    const result = await inspect(data, "empty");
    expect(result.text).toContain("Chưa đủ dữ liệu đánh giá");
    expect(result.text).toContain("Cần ít nhất ba nhóm tiêu chí");
    expect(result.text).not.toContain("NaN");
  });
  it("paginates long feedback and includes the final content and page numbers", async () => {
    const data = fixture();
    data.gaps = Array.from({ length: 5 }, (_, i) => `${i + 1}. ${"Cần bổ sung bằng chứng, phân tích nguyên nhân và đề xuất hành động cụ thể. ".repeat(35)}`);
    data.gaps.push("KẾT THÚC NHẬN XÉT");
    const result = await inspect(data, "long-feedback");
    expect(result.totalPages).toBeGreaterThan(2);
    expect(result.text).toContain("KẾT THÚC NHẬN XÉT");
    expect(result.text).toContain("Hành động tiếp theo");
    expect(result.text).toContain(`${result.totalPages} / ${result.totalPages}`);
  });
});
