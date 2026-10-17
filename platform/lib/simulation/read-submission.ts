import "server-only";
import { submissionHtmlToMarkdown } from "./document-markdown";

export async function readSubmissionDocument(file: File): Promise<string> {
  if (!file.size || file.size > 3 * 1024 * 1024) throw new Error("Tệp phải có nội dung và không quá 3 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text: string;
  if (extension === "pdf" && bytes.subarray(0, 5).toString() === "%PDF-") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    try {
      if (pdf.numPages > 30) throw new Error("Tài liệu bài làm không được quá 30 trang.");
      text = (await extractText(pdf, { mergePages: true })).text;
    } finally { await pdf.loadingTask.destroy(); }
    if (!text.trim()) throw new Error("PDF này không có lớp văn bản. Hãy dùng DOCX, PDF có văn bản hoặc dán nội dung bài làm.");
  } else if (extension === "docx" && bytes.subarray(0, 2).toString() === "PK") {
    const { convertToHtml } = await import("mammoth");
    text = submissionHtmlToMarkdown((await convertToHtml({ buffer: bytes })).value);
  } else if (["txt", "csv"].includes(extension ?? "") && !bytes.includes(0)) {
    text = bytes.toString("utf8");
  } else throw new Error("Chỉ hỗ trợ tài liệu PDF có văn bản, DOCX, TXT hoặc CSV.");
  text = text.trim().normalize("NFC");
  if (!text) throw new Error("Tệp chưa có nội dung văn bản để đưa vào bài làm.");
  if (text.length > 50_000) throw new Error("Nội dung tệp vượt quá 50.000 ký tự. Hãy rút gọn trước khi tải lên.");
  return text;
}
