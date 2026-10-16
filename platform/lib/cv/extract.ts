import "server-only";

export const MAX_CV_BYTES = 3 * 1024 * 1024;
export async function extractCVText(file: File): Promise<string> {
  if (!file.size || file.size > MAX_CV_BYTES) throw new Error("Tệp phải có nội dung và nhỏ hơn 3 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text: string;
  if (extension === "pdf" && buffer.subarray(0, 5).toString() === "%PDF-") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer), { maxImageSize: 4_194_304 });
    try {
      if (pdf.numPages > 15) throw new Error("CV không được quá 15 trang.");
      text = (await extractText(pdf, { mergePages: true })).text;
    } finally {
      await pdf.loadingTask.destroy();
    }
  } else if (extension === "docx" && buffer.subarray(0, 2).toString() === "PK") {
    const { extractRawText } = await import("mammoth");
    text = (await extractRawText({ buffer })).value;
  } else if (extension === "txt" && !buffer.includes(0)) {
    text = buffer.toString("utf8");
  } else {
    throw new Error("Chỉ hỗ trợ PDF có văn bản, DOCX hoặc TXT hợp lệ.");
  }
  text = text.trim();
  if (text.length < 40) throw new Error("Không đọc được đủ văn bản từ CV. Với bản scan, hãy tải bản có văn bản hoặc dán nội dung CV.");
  if (text.length > 40_000) throw new Error("Nội dung CV quá dài (tối đa 40.000 ký tự).");
  return text;
}
