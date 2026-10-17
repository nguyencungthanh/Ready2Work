import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
import { generateStructured } from "@/lib/ai/gemini";
import { recognizePdfText } from "@/lib/cv/ocr";

describe("scanned CV recognition", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("GEMINI_API_KEY", "test-only-key"); });
  afterEach(() => vi.unstubAllEnvs());
  it("passes the PDF inline and validates the recognized text", async () => {
    const text = "Experience with content marketing, social media, Excel and clear business communication.";
    vi.mocked(generateStructured).mockResolvedValue({ text });
    const pdf = new Uint8Array([37, 80, 68, 70, 45]);
    expect(await recognizePdfText(pdf)).toBe(text);
    expect(generateStructured).toHaveBeenCalledWith(expect.any(String), expect.any(Object), { mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") });
  });
  it("gives a useful scan-specific error when AI has not been configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(recognizePdfText(new Uint8Array())).rejects.toThrow("PDF này là dạng ảnh");
    expect(generateStructured).not.toHaveBeenCalled();
  });
  it("rejects empty, malformed or oversized OCR output", async () => {
    for (const raw of [{ text: "" }, { text: "x".repeat(40_001) }, { other: "unsupported" }]) {
      vi.mocked(generateStructured).mockResolvedValue(raw);
      await expect(recognizePdfText(new Uint8Array())).rejects.toThrow("Không đọc được chữ");
    }
  });
  it("does not expose provider messages containing private information", async () => {
    vi.mocked(generateStructured).mockRejectedValue(new Error("provider internals with private document text"));
    await expect(recognizePdfText(new Uint8Array())).rejects.toThrow("Không đọc được chữ");
    await expect(recognizePdfText(new Uint8Array())).rejects.not.toThrow("private document");
  });
  it("retries a temporary service outage once without accepting an invalid result", async () => {
    const text = "Experience creating content plans and evaluating marketing campaign performance.";
    vi.mocked(generateStructured).mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({ text });
    expect(await recognizePdfText(new Uint8Array())).toBe(text);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    vi.mocked(generateStructured).mockReset().mockRejectedValue({ status: 503 });
    await expect(recognizePdfText(new Uint8Array())).rejects.toThrow("Không đọc được chữ");
    expect(generateStructured).toHaveBeenCalledTimes(2);
  });
});
