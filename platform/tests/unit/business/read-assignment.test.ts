import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
vi.mock("@/lib/cv/ocr", () => ({ recognizePdfText: vi.fn() }));
vi.mock("mammoth", () => ({ extractRawText: vi.fn() }));
import { recognizePdfText } from "@/lib/cv/ocr";
import { extractRawText } from "mammoth";
import { readBusinessAssignment } from "@/lib/business/read-assignment";
import { extractCVDocument } from "@/lib/cv/extract";

const assignment = "Analyze the business dataset, explain your findings, and recommend practical next steps.";
beforeEach(() => vi.resetAllMocks());
describe("independent business assignment document formats", () => {
  it("reads the editor's generated TXT assignment locally while CV uploads still reject TXT", async () => {
    const file = new File([assignment], "assignment.txt", { type: "text/plain" });
    expect(await readBusinessAssignment(file)).toBe(assignment);
    await expect(extractCVDocument(file)).rejects.toThrow("Chỉ hỗ trợ tệp PDF");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("retains DOCX assignment support without accepting it as a CV", async () => {
    vi.mocked(extractRawText).mockResolvedValue({ value: assignment, messages: [] });
    const file = new File(["PK synthetic DOCX fixture"], "assignment.docx");
    expect(await readBusinessAssignment(file)).toBe(assignment);
    await expect(extractCVDocument(file)).rejects.toThrow("Chỉ hỗ trợ tệp PDF");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("retains local text extraction for PDF assignments", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText(assignment, { x: 30, y: 700, font, size: 9 });
    expect(await readBusinessAssignment(new File([new Uint8Array(await pdf.save())], "assignment.pdf"))).toContain(assignment);
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("retains the existing OCR fallback for scanned PDF assignments", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    vi.mocked(recognizePdfText).mockResolvedValue(assignment);
    expect(await readBusinessAssignment(new File([new Uint8Array(await pdf.save())], "assignment.pdf"))).toBe(assignment);
  });
  it("still rejects unsupported, empty, and oversized business documents", async () => {
    await expect(readBusinessAssignment(new File([assignment], "assignment.exe"))).rejects.toThrow("Chỉ hỗ trợ đề bài");
    await expect(readBusinessAssignment(new File([], "assignment.txt"))).rejects.toThrow("nội dung");
    await expect(readBusinessAssignment(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "assignment.txt"))).rejects.toThrow("3 MB");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
});
