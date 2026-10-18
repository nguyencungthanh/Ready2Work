import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(), client: vi.fn(), admin: vi.fn(), profile: vi.fn(), extract: vi.fn(), analyze: vi.fn(),
  upload: vi.fn(), remove: vi.fn(), insert: vi.fn(), storage: vi.fn(), from: vi.fn(), revalidate: vi.fn(),
  log: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: mocks.admin }));
vi.mock("@/lib/content/catalog", () => ({ getGoldenProfile: mocks.profile }));
vi.mock("@/lib/cv/extract", () => ({ extractCVDocument: mocks.extract }));
vi.mock("@/lib/cv/analyzer", () => ({ analyzeCV: mocks.analyze }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/observability/logger", () => ({ logger: { error: mocks.log, info: vi.fn() }, hashUserId: () => "owner-hash" }));
import { analyzeCVAction } from "@/app/roadmap/cv/actions";
import { CVAnalysisError } from "@/lib/cv/errors";

const text = "Synthetic applicant with experience using Excel and SQL for business analysis projects.";
function form(withFile = true) {
  const data = new FormData();
  data.set("positionId", "IT-01");
  data.set("consent", "on");
  if (withFile) data.set("cv", new File(["%PDF-1.7\nsynthetic fixture"], "CV.PDF", { type: "application/octet-stream" }));
  else data.set("cvText", text);
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "verified-owner" });
  mocks.profile.mockReturnValue({ position_id: "IT-01", position_name: "Business Analyst" });
  mocks.storage.mockReturnValue({ upload: mocks.upload, remove: mocks.remove });
  mocks.client.mockResolvedValue({ storage: { from: mocks.storage } });
  mocks.from.mockReturnValue({ insert: mocks.insert });
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.extract.mockResolvedValue({ text, method: "pdf-ocr" });
  mocks.analyze.mockResolvedValue({ provider: "ai", strengths: [], skillGaps: [] });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
});

describe("CV read, analysis and save boundary", () => {
  it("saves a recognized PDF under the verified owner with a normalized PDF MIME type", async () => {
    expect((await analyzeCVAction({}, form())).success).toBeDefined();
    expect(mocks.analyze).toHaveBeenCalledWith(text, expect.objectContaining({ position_id: "IT-01" }));
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^verified-owner\/[^/]+\/cv\.pdf$/), expect.any(File), { upsert: false, contentType: "application/pdf" });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "verified-owner", file_name: "CV.PDF", result: expect.objectContaining({ extractionMethod: "pdf-ocr", provider: "ai" }) }));
  });
  it("does not analyze, upload or save anything after PDF reading fails", async () => {
    mocks.extract.mockRejectedValue(new Error("Không đọc được chữ trong PDF dạng ảnh lúc này."));
    expect((await analyzeCVAction({}, form())).error).toContain("Không đọc được chữ");
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("distinguishes analysis failure from a PDF reading failure without fabricating saved results", async () => {
    mocks.analyze.mockRejectedValue(new Error("private provider response"));
    const result = await analyzeCVAction({}, form());
    expect(result.error).toContain("Đã đọc được CV nhưng AI chưa hoàn tất phân tích");
    expect(result.error).not.toContain("private");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("removes the newly uploaded PDF if saving its result fails", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "private database error" } });
    expect((await analyzeCVAction({}, form())).error).toContain("Không lưu được kết quả");
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0]?.[0]]);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("explains analysis quota failures separately from unreadable PDF errors", async () => {
    mocks.analyze.mockRejectedValue({ status: 429, message: "private provider details" });
    const result = await analyzeCVAction({}, form());
    expect(result.error).toContain("Đã đọc được CV");
    expect(result.error).toContain("giới hạn lượt gọi");
    expect(result.error).not.toContain("private");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it.each([
    [{ status: 401, message: "private provider response" }, "chưa xác thực", "CV_AI_AUTH"],
    [{ status: 403, message: "private provider response" }, "chưa xác thực", "CV_AI_AUTH"],
    [new CVAnalysisError("CV_INVALID_EVIDENCE", ["0"]), "bằng chứng hợp lệ", "CV_INVALID_EVIDENCE"],
    [new CVAnalysisError("CV_INCOMPLETE_ANALYSIS"), "đối chiếu đủ yêu cầu", "CV_INCOMPLETE_ANALYSIS"],
    [new CVAnalysisError("CV_INVALID_RESPONSE"), "đúng định dạng", "CV_INVALID_RESPONSE"],
    [{ status: 503, message: "private provider response" }, "tạm thời quá tải", "CV_AI_UNAVAILABLE"],
    [new DOMException("private timeout", "TimeoutError"), "phản hồi quá lâu", "CV_AI_TIMEOUT"],
  ])("distinguishes analysis failures and logs only safe metadata: %s", async (error, message, code) => {
    mocks.analyze.mockRejectedValue(error);
    const result = await analyzeCVAction({}, form());
    expect(result.error).toContain(message);
    expect(result.error).not.toContain("private");
    expect(mocks.log).toHaveBeenCalledWith("cv_processing_failed", expect.objectContaining({
      request_id: expect.any(String), user_id_hash: "owner-hash", operation: "analyze", error_code: code,
    }));
    const log = JSON.stringify(mocks.log.mock.calls);
    expect(log).not.toContain(text);
    expect(log).not.toContain("verified-owner");
    expect(log).not.toContain("private");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("distinguishes OCR authentication failure without saving or leaking provider details", async () => {
    mocks.extract.mockRejectedValue({ status: 401, message: "private provider response" });
    expect((await analyzeCVAction({}, form())).error).toContain("chưa xác thực");
    expect(mocks.log).toHaveBeenCalledWith("cv_processing_failed", expect.objectContaining({ operation: "read", error_code: "CV_AI_AUTH", status: 401 }));
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("preserves the save error if cleanup also fails", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "private database error" } });
    mocks.remove.mockRejectedValue(new Error("private storage error"));
    expect((await analyzeCVAction({}, form())).error).toContain("Không lưu được kết quả");
    expect(mocks.log).toHaveBeenCalledWith("cv_cleanup_failed", expect.objectContaining({ error_code: "CV_CLEANUP_FAILED" }));
  });
  it("keeps the existing pasted-text option without uploading a file", async () => {
    expect((await analyzeCVAction({}, form(false))).success).toBeDefined();
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ file_path: null, file_name: null, result: expect.objectContaining({ extractionMethod: "pasted" }) }));
  });
  it("requires consent before processing or sending CV data", async () => {
    const data = form();
    data.delete("consent");
    expect((await analyzeCVAction({}, data)).error).toContain("đồng ý");
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.analyze).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
