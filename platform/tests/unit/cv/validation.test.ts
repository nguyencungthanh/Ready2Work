import { describe, expect, it } from "vitest";
import { MAX_CV_BYTES, validateCVFile } from "@/lib/cv/validation";

describe("PDF-only CV selection", () => {
  it.each(["cv.docx", "cv.txt", "cv.png", "cv.pdf.exe"])("rejects %s consistently for file-picker and drop validation", (name) => {
    expect(validateCVFile({ name, size: 100, type: "" })).toContain("Chỉ hỗ trợ tệp PDF");
  });
  it("rejects empty, oversized, and mismatched-MIME selections", () => {
    expect(validateCVFile({ name: "cv.pdf", size: 0, type: "application/pdf" })).toContain("nội dung");
    expect(validateCVFile({ name: "cv.pdf", size: MAX_CV_BYTES + 1, type: "application/pdf" })).toContain("3 MB");
    expect(validateCVFile({ name: "cv.pdf", size: 100, type: "image/png" })).toContain("Chỉ hỗ trợ tệp PDF");
  });
  it.each(["application/pdf", "application/x-pdf", "application/octet-stream", ""])("accepts PDFs reported as %s, leaving byte validation to the server", (type) => {
    expect(validateCVFile({ name: "CV.PDF", size: MAX_CV_BYTES, type })).toBeUndefined();
  });
});
