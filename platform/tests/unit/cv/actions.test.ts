import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(), client: vi.fn(), admin: vi.fn(), profile: vi.fn(), extract: vi.fn(), analyze: vi.fn(),
  upload: vi.fn(), remove: vi.fn(), insert: vi.fn(), storage: vi.fn(), from: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.client }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleClient: mocks.admin }));
vi.mock("@/lib/content/catalog", () => ({ getGoldenProfile: mocks.profile }));
vi.mock("@/lib/cv/extract", () => ({ extractCVDocument: mocks.extract }));
vi.mock("@/lib/cv/analyzer", () => ({ analyzeCV: mocks.analyze }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { analyzeCVAction } from "@/app/roadmap/cv/actions";

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
