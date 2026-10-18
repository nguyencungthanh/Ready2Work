import "server-only";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { recognizePdfText } from "./ocr";
import { hasReadableCVText } from "./text";
import { MAX_CV_CHARACTERS, MAX_CV_PAGES, validateCVFile } from "./validation";

export { MAX_CV_BYTES } from "./validation";
export type CVExtractionMethod = "pdf-text" | "pdf-ocr";

export async function extractCVDocument(file: File): Promise<{ text: string; method: CVExtractionMethod }> {
  const validationError = validateCVFile(file);
  if (validationError) throw new Error(validationError);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!/%PDF-\d\.\d/.test(buffer.subarray(0, 1024).toString("latin1"))) {
    throw new Error("Chỉ hỗ trợ tệp PDF hợp lệ; đổi đuôi tệp sang .pdf không chuyển được định dạng.");
  }

  // Validate structure, encryption and page count before any external AI call.
  // OCR can then recover a valid PDF even when its local text parser fails.
  let document: PDFDocument;
  let pageCount = 0;
  try {
    document = await PDFDocument.load(buffer, { updateMetadata: false, ignoreEncryption: true });
    if (!document.isEncrypted) pageCount = document.getPageCount();
  } catch {
    throw new Error("Tệp PDF bị hỏng hoặc không hợp lệ. Vui lòng xuất lại CV thành PDF rồi thử lại.");
  }
  if (document.isEncrypted) throw new Error("Tệp PDF có mật khẩu. Vui lòng bỏ mật khẩu bảo vệ rồi tải lại CV.");
  if (!pageCount) throw new Error("Tệp PDF không có trang nào để đọc.");
  if (pageCount > MAX_CV_PAGES) throw new Error("CV không được quá 15 trang.");

  // Image sections can coexist with substantial text. Reading only that text
  // silently drops evidence, so recognize the complete PDF if it has images.
  let needsRecognition = document.context.enumerateIndirectObjects().some(([, object]) =>
    object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
  );
  let text = "";
  if (!needsRecognition) {
    const { extractText, getDocumentProxy, getResolvedPDFJS } = await import("unpdf");
    let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | undefined;
    try {
      pdf = await getDocumentProxy(new Uint8Array(buffer), { maxImageSize: 4_194_304 });
      const extracted = await extractText(pdf, { mergePages: false });
      text = extracted.text.join("\n\n");
      // A good first page must not hide an unreadable later one.
      needsRecognition = extracted.text.some((page) => !hasReadableCVText(page));
      if (!needsRecognition) {
        const { OPS } = await getResolvedPDFJS();
        const imageOperations = new Set([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject]);
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const operations = await page.getOperatorList();
          if (operations.fnArray.some((operation: number) => imageOperations.has(operation))) {
            needsRecognition = true;
            break;
          }
        }
      }
    } catch {
      needsRecognition = true;
    } finally {
      await pdf?.loadingTask.destroy().catch(() => undefined);
    }
  }
  if (needsRecognition) text = await recognizePdfText(buffer);
  text = text.normalize("NFC").trim();
  if (!hasReadableCVText(text)) throw new Error("Không đọc được đủ văn bản từ CV. Vui lòng dùng bản PDF rõ chữ hoặc dán nội dung CV.");
  if (text.length > MAX_CV_CHARACTERS) throw new Error("Nội dung CV quá dài (tối đa 40.000 ký tự).");
  return { text, method: needsRecognition ? "pdf-ocr" : "pdf-text" };
}

export async function extractCVText(file: File): Promise<string> {
  return (await extractCVDocument(file)).text;
}
