import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
vi.mock("unpdf", () => ({ getDocumentProxy: vi.fn(), extractText: vi.fn(), getResolvedPDFJS: vi.fn() }));
vi.mock("@/lib/cv/ocr", () => ({ recognizePdfText: vi.fn() }));
import { getDocumentProxy, extractText } from "unpdf";
import { recognizePdfText } from "@/lib/cv/ocr";
import { extractCVDocument } from "@/lib/cv/extract";

const text = "Synthetic applicant with SQL, Excel and business analysis project experience.";
async function validPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage().drawText(text, { x: 30, y: 700, font, size: 9 });
  return new File([new Uint8Array(await pdf.save())], "cv.pdf");
}
describe("validated PDF parser fallback", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.mocked(recognizePdfText).mockResolvedValue(text); });
  it("recovers a valid PDF when the local reader cannot open it", async () => {
    vi.mocked(getDocumentProxy).mockRejectedValue(new Error("Unsupported parser feature"));
    expect(await extractCVDocument(await validPdf())).toEqual({ method: "pdf-ocr", text });
    expect(recognizePdfText).toHaveBeenCalledOnce();
  });
  it("releases parser resources and recovers when text extraction fails", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined);
    vi.mocked(getDocumentProxy).mockResolvedValue({ loadingTask: { destroy } } as never);
    vi.mocked(extractText).mockRejectedValue(new Error("Broken font map"));
    expect(await extractCVDocument(await validPdf())).toEqual({ method: "pdf-ocr", text });
    expect(destroy).toHaveBeenCalledOnce();
  });
});
