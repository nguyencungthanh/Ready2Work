import "server-only";
import { z } from "zod";
import { responsesConfig } from "./config";
import { generateChatReply, type ChatTurn } from "./gemini";
import { ASSISTANT_MAX_REPLY_TEXT } from "@/lib/assistant/limits";

const chunkSchema = z.object({
  error: z.unknown().optional(),
  choices: z.array(z.object({
    delta: z.object({ content: z.string().nullable().optional(), refusal: z.string().nullable().optional() }),
    finish_reason: z.string().nullable().optional(),
  })).optional(),
});
const invalid = () => new Error("AI stream did not complete a valid reply.");

/** Parse SSE incrementally, including split UTF-8 and CRLF boundaries. */
export async function* readChatStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "", length = 0, completed = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // Keep incomplete event memory bounded without limiting a whole reply.
      while (true) {
        const boundary = /\r?\n\r?\n/.exec(pending);
        if (!boundary) break;
        const event = pending.slice(0, boundary.index);
        pending = pending.slice(boundary.index + boundary[0].length);
        if (event.length > 64_000) throw invalid();
        const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, "")).join("\n");
        if (!data) continue;
        if (data === "[DONE]") {
          if (!completed || !length) throw invalid();
          return;
        }
        const parsed = chunkSchema.safeParse(JSON.parse(data));
        if (!parsed.success || parsed.data.error) throw invalid();
        const choice = parsed.data.choices?.[0];
        if (!choice) continue; // Some gateways send a final usage-only event.
        if (completed || choice.delta.refusal) throw invalid();
        const text = choice.delta.content;
        if (text) {
          length += text.length;
          if (length > ASSISTANT_MAX_REPLY_TEXT) throw invalid();
          yield text;
        }
        if (choice.finish_reason) {
          if (choice.finish_reason !== "stop") throw invalid();
          completed = true;
        }
      }
      if (pending.length > 64_000) throw invalid();
      if (done) {
        if (!completed || !length || pending.trim()) throw invalid();
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Stream only on the gateway whose SSE contract is covered by live tests. */
export async function* streamChatReply(system: string, history: ChatTurn[], signal: AbortSignal): AsyncGenerator<string> {
  if (history.at(-1)?.role !== "user") throw new Error("Chat history must end with a user turn.");
  const config = responsesConfig();
  if (!config || new URL(config.endpoint).hostname !== "api.vilao.ai") {
    signal.throwIfAborted();
    const reply = await generateChatReply(system, history, { maxOutputTokens: 1200 });
    signal.throwIfAborted();
    yield z.string().trim().min(1).max(ASSISTANT_MAX_REPLY_TEXT).parse(reply);
    return;
  }
  const response = await fetch(config.endpoint.replace(/\/responses$/, "/chat/completions"), {
    method: "POST", cache: "no-store", redirect: "error",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
    body: JSON.stringify({ model: config.model, store: false, stream: true, max_tokens: 1200,
      messages: [{ role: "system", content: system }, ...history.map((turn) => ({ role: turn.role === "model" ? "assistant" : "user", content: turn.text }))] }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw Object.assign(new Error(`AI provider returned HTTP ${response.status}.`), { status: response.status });
  }
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    await response.body?.cancel();
    throw invalid();
  }
  yield* readChatStream(response.body);
}
