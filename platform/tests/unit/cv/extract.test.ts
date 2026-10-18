import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
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
async function imagePdf({ withText = false, mixedPages = false } = {}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const image = await pdf.embedPng(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cD1cAAAAASUVORK5CYII=", "base64"));
  const page = pdf.addPage();
  if (withText || mixedPages) page.drawText(text, { x: 40, y: 700, size: 9, font });
  (mixedPages ? pdf.addPage() : page).drawImage(image, { x: 0, y: 0, width: 500, height: 650 });
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
  it.each([
    { withText: false, mixedPages: false },
    { withText: true, mixedPages: false },
    { withText: false, mixedPages: true },
  ])("recognizes all image sections even when existing text exceeds the old 40-character threshold: %j", async (options) => {
    vi.mocked(recognizePdfText).mockResolvedValue(`${text} Additional skills from the image: SQL and Python.`);
    const result = await extractCVDocument(await imagePdf(options));
    expect(result.method).toBe("pdf-ocr");
    expect(result.text).toContain("Additional skills from the image");
    expect(recognizePdfText).toHaveBeenCalledOnce();
  });
  it("recognizes a later unreadable page rather than silently returning only the first", async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText(text, { x: 40, y: 700, font, size: 9 });
    pdf.addPage().drawText("(cid:123) (cid:124) ".repeat(20), { x: 40, y: 700, font, size: 9 });
    vi.mocked(recognizePdfText).mockResolvedValue(text);
    expect((await extractCVDocument(new File([new Uint8Array(await pdf.save())], "cv.pdf"))).method).toBe("pdf-ocr");
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
  it("rejects TXT, DOCX, images and disguised non-PDF files before calling AI", async () => {
    for (const name of ["sample.txt", "sample.docx", "sample.jpg", "sample.pdf.exe"]) {
      await expect(extractCVDocument(new File([text], name))).rejects.toThrow("Chỉ hỗ trợ tệp PDF");
    }
    await expect(extractCVDocument(new File([text], "sample.pdf"))).rejects.toThrow("Chỉ hỗ trợ");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("accepts uppercase PDF filenames and browser-neutral MIME types", async () => {
    const original = await pdfFile(1, true);
    for (const type of ["", "application/octet-stream", "application/pdf"]) {
      const result = await extractCVDocument(new File([await original.arrayBuffer()], "CV.PDF", { type }));
      expect(result.method).toBe("pdf-text");
    }
  });
  it("rejects an encrypted PDF with a useful error before any OCR call", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.context.trailerInfo.Encrypt = pdf.context.register(pdf.context.obj({ Filter: PDFName.of("Standard"), V: 2 }));
    await expect(extractCVDocument(new File([new Uint8Array(await pdf.save())], "locked.pdf"))).rejects.toThrow("mật khẩu");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
  it("rejects structurally broken PDFs instead of sending arbitrary bytes to AI", async () => {
    await expect(extractCVDocument(new File(["%PDF-1.7\nnot a valid document"], "broken.pdf"))).rejects.toThrow("bị hỏng");
    expect(recognizePdfText).not.toHaveBeenCalled();
  });
});
