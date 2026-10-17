import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
vi.mock("@/lib/cv/ocr", () => ({ recognizePdfText: vi.fn() }));
import { recognizePdfText } from "@/lib/cv/ocr";
import { extractCVDocument, MAX_CV_BYTES } from "@/lib/cv/extract";

const text = "Marketing student with experience creating social media content and working with Excel.";
async function pdfFile(pages = 1, withText = false) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage();
    if (withText) page.drawText(text, { x: 40, y: 700, size: 9, font });
  }
  return new File([new Uint8Array(await pdf.save())], "sample.pdf", { type: "application/pdf" });
}
describe("CV document reading", () => {
  beforeEach(() => vi.resetAllMocks());
  it("reads existing PDF text without sending the file for OCR", async () => {
    const result = await extractCVDocument(await pdfFile(1, true));
    expect(result.method).toBe("pdf-text");
    expect(result.text).toContain(text);
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("uses OCR when a valid PDF has no usable text layer", async () => {
    vi.mocked(recognizePdfText).mockResolvedValue(text);
    const result = await extractCVDocument(await pdfFile());
    expect(result).toEqual({ method: "pdf-ocr", text });
    expect(recognizePdfText).toHaveBeenCalledOnce();
  });
  it("enforces page and file limits before calling OCR", async () => {
    await expect(extractCVDocument(await pdfFile(16))).rejects.toThrow("15 trang");
    await expect(extractCVDocument(new File([new Uint8Array(MAX_CV_BYTES + 1)], "large.pdf"))).rejects.toThrow("3 MB");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("propagates OCR failure instead of manufacturing extracted text", async () => {
    vi.mocked(recognizePdfText).mockRejectedValue(new Error("Không đọc được chữ trong PDF dạng ảnh."));
    await expect(extractCVDocument(await pdfFile())).rejects.toThrow("Không đọc được chữ");
  });
  it("keeps TXT local and rejects a disguised non-PDF file", async () => {
    expect(await extractCVDocument(new File([text], "sample.txt"))).toEqual({ method: "txt", text });
    await expect(extractCVDocument(new File([text], "sample.pdf"))).rejects.toThrow("Chỉ hỗ trợ");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
});
