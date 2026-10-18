import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readChatStream, streamChatReply } from "@/lib/ai/chat-stream";
import { readAssistantReply } from "@/lib/assistant/read-stream";

const encode = new TextEncoder();
const event = (content: string, finish_reason: string | null = null) => `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason }] })}\r\n\r\n`;
function bytes(text: string, split = 1) {
  const data = encode.encode(text);
  return new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < data.length; i += split) c.enqueue(data.slice(i, i + split)); c.close(); } });
}
async function collect(stream: AsyncIterable<string>) { let text = ""; for await (const delta of stream) text += delta; return text; }
beforeEach(() => {
  vi.stubEnv("AI_BASE_URL", "https://api.vilao.ai/v1");
  vi.stubEnv("AI_API_KEY", "synthetic-test-key"); vi.stubEnv("AI_MODEL", "synthetic-model");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("preserves Vietnamese split across bytes and events and requires successful completion", async () => {
  expect(await collect(readChatStream(bytes(event("Xin chào ") + event("bạn", "stop") + "data: [DONE]\r\n\r\n")))).toBe("Xin chào bạn");
});
it.each([
  event("partial"), event("partial", "length"), event("x".repeat(6001), "stop"),
  "data: [DONE]\n\n", "data: invalid JSON\n\n", "data: " + "x".repeat(64_001),
  'data: {"error":{"message":"private"}}\n\n',
  'data: {"choices":[{"delta":{"refusal":"private"},"finish_reason":"stop"}]}\n\n',
])("rejects incomplete, refused, oversized or failed streams (%#)", async (input) => {
  await expect(collect(readChatStream(bytes(input, 4096)))).rejects.toThrow();
});
it("yields a token before provider completion and cancels upstream when the consumer stops", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const cancelled = vi.fn();
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; }, cancel: cancelled });
  const stream = readChatStream(body);
  controller.enqueue(encode.encode(event("First")));
  expect(await stream.next()).toEqual({ value: "First", done: false });
  await stream.return(undefined);
  expect(cancelled).toHaveBeenCalledOnce();
});
it("uses one bounded, abortable Vilao request without exposing keys or changing providers", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(bytes(event("OK", "stop")), { headers: { "Content-Type": "text/event-stream" } }));
  vi.stubGlobal("fetch", fetcher);
  expect(await collect(streamChatReply("System", [{ role: "user", text: "Question" }], new AbortController().signal))).toBe("OK");
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe("https://api.vilao.ai/v1/chat/completions");
  expect(init.signal).toBeInstanceOf(AbortSignal);
  expect(JSON.parse(init.body)).toMatchObject({ stream: true, store: false, max_tokens: 1200, messages: [{ role: "system", content: "System" }, { role: "user", content: "Question" }] });
});
it.each([401, 429, 503])("preserves HTTP %s before streaming starts without retrying", async (status) => {
  const fetcher = vi.fn().mockResolvedValue(new Response("private-provider-body", { status })); vi.stubGlobal("fetch", fetcher);
  await expect(collect(streamChatReply("System", [{ role: "user", text: "Question" }], new AbortController().signal))).rejects.toMatchObject({ status, message: `AI provider returned HTTP ${status}.` });
  expect(fetcher).toHaveBeenCalledOnce();
});
it("updates the client before completion, and commits only a confirmed reply", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let firstText!: () => void;
  const visible = new Promise<void>((resolve) => { firstText = resolve; });
  const body = new ReadableStream<Uint8Array>({ start(c) { controller = c; } });
  const texts: string[] = [];
  let settled = false;
  const result = readAssistantReply(body, (text) => { texts.push(text); firstText(); }).then((reply) => { settled = true; return reply; });
  controller.enqueue(encode.encode('{"delta":"Xin chào"}\n'));
  await visible;
  expect(texts).toEqual(["Xin chào"]); expect(settled).toBe(false);
  controller.enqueue(encode.encode('{"delta":" bạn"}\n{"done":true}\n')); controller.close();
  expect(await result).toBe("Xin chào bạn");
});
it.each(['{"delta":"partial"}\n', '{"delta":"partial"}\n{"error":"failed"}\n', '{"done":true}\n']) (
  "does not commit incomplete or failed client replies (%#)", async (input) => {
    await expect(readAssistantReply(bytes(input), vi.fn())).rejects.toThrow();
  });
