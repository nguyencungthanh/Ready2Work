export const MAX_CV_BYTES = 3 * 1024 * 1024;
export const MAX_CV_PAGES = 15;
export const MIN_CV_CHARACTERS = 40;
export const MAX_CV_CHARACTERS = 40_000;

/** Shared by the file picker, drag-and-drop, and the server upload boundary. */
export function validateCVFile(file: Pick<File, "name" | "size" | "type">): string | undefined {
  if (!/\.pdf$/i.test(file.name) || !["", "application/pdf", "application/x-pdf", "application/octet-stream"].includes(file.type.toLowerCase())) {
    return "Chỉ hỗ trợ tệp PDF. Vui lòng xuất CV thành PDF rồi tải lên.";
  }
  if (!file.size || file.size > MAX_CV_BYTES) return "Tệp PDF phải có nội dung và không vượt quá 3 MB.";
}
