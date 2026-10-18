import "server-only";
import { recognizePdfText } from "@/lib/cv/ocr";

/** Business assignment formats are independent of the PDF-only CV boundary. */
export async function readBusinessAssignment(file: File): Promise<string> {
  if (!file.size || file.size > 3 * 1024 * 1024) throw new Error("Tệp đề bài phải có nội dung và không vượt quá 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text: string;
  if (extension === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer), { maxImageSize: 4_194_304 });
    try {
      if (pdf.numPages > 15) throw new Error("Tệp đề bài không được quá 15 trang.");
      text = (await extractText(pdf, { mergePages: true })).text;
    } finally {
      await pdf.loadingTask.destroy();
    }
    if (text.trim().length < 40) text = await recognizePdfText(buffer);
  } else if (extension === "docx" && buffer.subarray(0, 2).toString() === "PK") {
    const { extractRawText } = await import("mammoth");
    text = (await extractRawText({ buffer })).value;
  } else if (extension === "txt" && !buffer.includes(0)) {
    text = buffer.toString("utf8");
  } else {
    throw new Error("Chỉ hỗ trợ đề bài PDF, DOCX hoặc TXT hợp lệ.");
  }
  text = text.trim().normalize("NFC");
  if (text.length < 40) throw new Error("Không đọc được đủ văn bản từ đề bài (tối thiểu 40 ký tự).");
  if (text.length > 40_000) throw new Error("Tệp đề bài quá dài (tối đa 40.000 ký tự).");
  return text;
}
