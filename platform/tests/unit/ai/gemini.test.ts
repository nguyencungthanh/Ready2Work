import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generateContent: vi.fn(), createChat: vi.fn(), sendMessage: vi.fn(), construct: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class {
  constructor(options: unknown) { mocks.construct(options); }
  models = { generateContent: mocks.generateContent };
  chats = { create: mocks.createChat };
} }));
import { generateStructured, generateChatReply } from "@/lib/ai/gemini";

beforeEach(() => { vi.stubEnv("AI_BASE_URL", ""); vi.stubEnv("GEMINI_API_KEY", "unit-test-key"); mocks.generateContent.mockReset().mockResolvedValue({ text: '{"ok":true}' }); mocks.construct.mockClear(); mocks.createChat.mockReset().mockReturnValue({ sendMessage: mocks.sendMessage }); mocks.sendMessage.mockReset().mockResolvedValue({ text: "Hướng dẫn bằng tiếng Việt." }); });
afterEach(() => vi.unstubAllEnvs());
describe("Gemini structured multimodal request", () => {
  it("passes source images to the SDK in the same order as their prompt labels", async () => {
    const images = [{ data: "AQ==", mimeType: "image/png" as const }, { data: "Ag==", mimeType: "image/jpeg" as const }];
    expect(await generateStructured("Ảnh 1 rồi ảnh 2", { type: "object" }, images)).toEqual({ ok: true });
    expect(mocks.generateContent.mock.calls[0]?.[0].contents).toEqual([{ text: "Ảnh 1 rồi ảnh 2" }, { inlineData: images[0] }, { inlineData: images[1] }]);
  });
  it("keeps the original inline PDF argument compatible", async () => {
    const pdf = { data: "JVBERi0=", mimeType: "application/pdf" as const };
    await generateStructured("Nhận dạng văn bản", { type: "object" }, pdf);
    expect(mocks.generateContent.mock.calls[0]?.[0].contents).toEqual([{ text: "Nhận dạng văn bản" }, { inlineData: pdf }]);
  });
  it("keeps text-only grading requests text-only", async () => {
    await generateStructured("Barem nguồn", { type: "object" });
    expect(mocks.generateContent.mock.calls[0]?.[0].contents).toBe("Barem nguồn");
  });
  it("extends only an explicitly opted-in document request timeout", async () => {
    await generateStructured("Đọc CV", { type: "object" }, { data: "JVBERi0=", mimeType: "application/pdf" }, { timeoutMs: 45_000 });
    expect(mocks.generateContent.mock.calls[0]?.[0].config.httpOptions).toEqual({ timeout: 45_000 });
    mocks.generateContent.mockClear();
    await generateStructured("Barem nguồn", { type: "object" });
    expect(mocks.generateContent.mock.calls[0]?.[0].config.httpOptions).toBeUndefined();
  });
});

describe("Gemini conversational adapter", () => {
  it("uses the server key and configured model, separating prior turns from the current message", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/ai/gemini");
    expect(await fresh.generateChatReply("Ngữ cảnh công khai", [{ role: "user", text: "Câu trước" }, { role: "model", text: "Phản hồi trước" }, { role: "user", text: "Câu tiếp" }], { maxOutputTokens: 1200 })).toBe("Hướng dẫn bằng tiếng Việt.");
    expect(mocks.construct).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "unit-test-key" }));
    expect(mocks.createChat).toHaveBeenCalledWith({ model: expect.any(String), history: [{ role: "user", parts: [{ text: "Câu trước" }] }, { role: "model", parts: [{ text: "Phản hồi trước" }] }], config: { systemInstruction: "Ngữ cảnh công khai", maxOutputTokens: 1200 } });
    expect(mocks.sendMessage).toHaveBeenCalledWith({ message: "Câu tiếp" });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });
  it("rejects an empty provider reply rather than creating an answer", async () => {
    mocks.sendMessage.mockResolvedValue({ text: "" });
    await expect(generateChatReply("Ngữ cảnh", [{ role: "user", text: "Câu hỏi" }])).rejects.toThrow("empty response");
  });
});
