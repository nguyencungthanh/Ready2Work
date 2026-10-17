import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { readSubmissionDocument } from "@/lib/simulation/read-submission";

describe("submission document upload", () => {
  it("reads text/CSV without sending files to an AI provider", async () => {
    const text = "Chỉ tiêu,Nhận xét\nDoanh thu,Cần kiểm tra số liệu";
    expect(await readSubmissionDocument(new File([text], "bai-lam.csv"))).toBe(text);
  });
  it("reads PDF text and rejects image-only PDFs with a useful message", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText("Submission evidence and business recommendations.", { x: 20, y: 400, font, size: 10 });
    expect(await readSubmissionDocument(new File([new Uint8Array(await pdf.save())], "bai-lam.pdf"))).toContain("business recommendations");
    const empty = await PDFDocument.create(); empty.addPage();
    await expect(readSubmissionDocument(new File([new Uint8Array(await empty.save())], "scan.pdf"))).rejects.toThrow("không có lớp văn bản");
  });
  it("rejects invalid types and excessive inputs", async () => {
    await expect(readSubmissionDocument(new File(["not a PDF"], "fake.pdf"))).rejects.toThrow("Chỉ hỗ trợ");
    await expect(readSubmissionDocument(new File(["x".repeat(50_001)], "large.txt"))).rejects.toThrow("50.000");
    await expect(readSubmissionDocument(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.pdf"))).rejects.toThrow("3 MB");
  });
});
