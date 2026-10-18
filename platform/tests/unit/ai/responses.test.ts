import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const google = vi.hoisted(() => vi.fn());
const renderPdf = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/pdf-images", () => ({ pdfPageImages: renderPdf }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { constructor() { google(); } } }));
import { generateChatReply, generateStructured } from "@/lib/ai/gemini";
import { aiProviderLabel, hasAIKey, responsesConfig } from "@/lib/ai/config";

const fetchMock = vi.fn();
const success = (text = '{"ok":true}') => new Response(JSON.stringify({ status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }));
const schema = { type: "object", properties: { ok: { type: "boolean" }, rows: { type: "array", items: { type: "object", properties: { text: { type: "string" } } } } } };
beforeEach(() => {
  vi.stubEnv("AI_BASE_URL", "https://api.vilao.ai/v1/");
  vi.stubEnv("AI_MODEL", "sba/ag/gemini-3.8-flash");
  vi.stubEnv("AI_API_KEY", "gateway-test-key");
  vi.stubEnv("GEMINI_API_KEY", "legacy-test-key");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset().mockImplementation(() => Promise.resolve(success()));
  google.mockClear();
  renderPdf.mockReset().mockResolvedValue([{ mimeType: "image/jpeg", data: "page-one" }, { mimeType: "image/jpeg", data: "page-two" }]);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Responses gateway routing", () => {
  it("sends ordered PDF/image inputs and strict nested schemas to the selected endpoint", async () => {
    vi.stubEnv("AI_BASE_URL", "https://gateway.example/v1");
    const original = JSON.stringify(schema);
    expect(await generateStructured("CV synthetic", schema, [{ data: "AQ==", mimeType: "application/pdf" }, { data: "Ag==", mimeType: "image/png" }], { timeoutMs: 45_000 })).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://gateway.example/v1/responses");
    expect(init).toMatchObject({ method: "POST", redirect: "error", cache: "no-store", headers: { Authorization: "Bearer gateway-test-key" } });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "sba/ag/gemini-3.8-flash", store: false, input: [{ role: "user", content: [{ type: "input_text", text: "CV synthetic" }, { type: "input_file", filename: "document-0.pdf", file_data: "data:application/pdf;base64,AQ==" }, { type: "input_image", image_url: "data:image/png;base64,Ag==" }] }] });
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true, schema: { additionalProperties: false, required: ["ok", "rows"], properties: { rows: { items: { additionalProperties: false, required: ["text"] } } } } });
    expect(JSON.stringify(schema)).toBe(original);
    expect(google).not.toHaveBeenCalled();
  });

  it("uses string input for structured text requests accepted by Vilao", async () => {
    await generateStructured("Synthetic text CV", schema);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).input).toBe("Synthetic text CV");
    expect(renderPdf).not.toHaveBeenCalled();
  });
  it("sends every rendered PDF page and source image in order through Vilao chat", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: '```json\n{"ok":true}\n```' } }] })));
    expect(await generateStructured("Read all pages", schema, [{ mimeType: "application/pdf", data: "pdf-source" }, { mimeType: "image/png", data: "source-image" }])).toEqual({ ok: true });
    expect(renderPdf).toHaveBeenCalledWith("pdf-source");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.vilao.ai/v1/chat/completions");
    const body = JSON.parse(init.body);
    expect(body.messages[1].content).toEqual([{ type: "text", text: "Read all pages" }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,page-one" } }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,page-two" } }, { type: "image_url", image_url: { url: "data:image/png;base64,source-image" } }]);
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    expect(google).not.toHaveBeenCalled();
  });
  it.each([
    { finish_reason: "length", message: { content: '{"ok":true}' } },
    { finish_reason: "stop", message: { content: 'Here is JSON: {"ok":true}' } },
    { finish_reason: "stop", message: { content: '```json\n{"ok":' } },
    { finish_reason: "stop", message: { refusal: "private refusal" } },
  ])("rejects incomplete, refused or free-form chat output (%#)", async (choice) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ choices: [choice] })));
    await expect(generateStructured("Synthetic", schema, { mimeType: "image/png", data: "AQ==" })).rejects.toThrow(/^AI provider /);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("accepts one complete JSON fence in text results while still rejecting prose", async () => {
    fetchMock.mockResolvedValue(success('```json\n{"ok":true}\n```'));
    expect(await generateStructured("Synthetic", schema)).toEqual({ ok: true });
    fetchMock.mockResolvedValue(success('Result: {"ok":true}'));
    await expect(generateStructured("Synthetic", schema)).rejects.toThrow("invalid JSON");
  });

  it("preserves conversation roles, system instructions and output limits", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ output_text: "Xin chào" })));
    expect(await generateChatReply("System", [{ role: "user", text: "First" }, { role: "model", text: "Reply" }, { role: "user", text: "Next" }], { maxOutputTokens: 1200 })).toBe("Xin chào");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ instructions: "System", max_output_tokens: 1200, input: [{ role: "user", content: "First" }, { role: "assistant", content: "Reply" }, { role: "user", content: "Next" }] });
  });

  it.each([401, 429, 503])("preserves HTTP %i without leaking bodies, retrying or falling back to Google", async (status) => {
    fetchMock.mockResolvedValue(new Response("sensitive echoed data", { status }));
    await expect(generateStructured("Synthetic", schema)).rejects.toMatchObject({ status, message: `AI provider returned HTTP ${status}.` });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(google).not.toHaveBeenCalled();
  });

  it.each([
    { status: "incomplete", output_text: '{"ok":true}' },
    { error: { message: "sensitive data" }, output_text: '{"ok":true}' },
    { output_text: "" },
    { output_text: "not JSON sensitive data" },
    { output: [{ type: "message", content: [{ type: "refusal" }] }] },
    { output: [{ type: "message", role: "user", content: [{ type: "output_text", text: '{"ok":true}' }] }] },
  ])("rejects failed, empty, refused or malformed output safely (%#)", async (body) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body)));
    await expect(generateStructured("Synthetic", schema)).rejects.toThrow(/^AI provider /);
  });

  it("propagates timeout failures without cross-provider retries", async () => {
    fetchMock.mockRejectedValue(new DOMException("Timed out", "TimeoutError"));
    await expect(generateStructured("Synthetic", schema)).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(google).not.toHaveBeenCalled();
  });
});

describe("server-only provider configuration", () => {
  it("reuses the existing key only when a gateway is explicitly selected", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(responsesConfig()?.apiKey).toBe("legacy-test-key");
    expect(hasAIKey()).toBe(true);
    expect(aiProviderLabel()).toBe("Vilao AI");
    vi.stubEnv("AI_BASE_URL", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("AI_API_KEY", "gateway-only");
    expect(responsesConfig()).toBeNull();
    expect(hasAIKey()).toBe(false);
    expect(aiProviderLabel()).toBe("Google Gemini");
  });
  it.each(["http://api.vilao.ai/v1", "https://user:password@api.vilao.ai/v1", "https://api.vilao.ai/v1?key=x", "https://api.vilao.ai/v1#fragment", "invalid"])("rejects invalid gateway configuration before sending credentials (%s)", async (base) => {
    vi.stubEnv("AI_BASE_URL", base);
    await expect(generateStructured("Synthetic", schema)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(google).not.toHaveBeenCalled();
  });
  it("requires an explicit gateway model", async () => {
    vi.stubEnv("AI_MODEL", "");
    await expect(generateStructured("Synthetic", schema)).rejects.toThrow("AI_MODEL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
