import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent: mocks.generateContent }; } }));
import { generateStructured } from "@/lib/ai/gemini";

beforeEach(() => { vi.stubEnv("GEMINI_API_KEY", "unit-test-key"); mocks.generateContent.mockReset().mockResolvedValue({ text: '{"ok":true}' }); });
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
});
