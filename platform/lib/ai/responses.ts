import "server-only";
import { z } from "zod";
import { responsesConfig } from "./config";
import type { ChatTurn, InlineAttachment } from "./gemini";

const envelope = z.object({
  status: z.string().optional(), error: z.unknown().optional(), output_text: z.string().optional(),
  output: z.array(z.object({
    type: z.string(), role: z.string().optional(),
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
  })).optional(),
});

function parseJSON(text: string): unknown {
  try { return JSON.parse(text); }
  catch { throw new SyntaxError("AI provider returned invalid JSON."); }
}

/** Match the strict Responses schema contract without mutating shared schemas. */
function strictSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strictSchema);
  if (value === null || typeof value !== "object") return value;
  const schema = Object.fromEntries(Object.entries(value).map(([key, item]) => [key, strictSchema(item)]));
  if (schema.type === "object" && schema.properties && typeof schema.properties === "object") {
    schema.additionalProperties = false;
    schema.required = Object.keys(schema.properties);
  }
  return schema;
}

async function request(body: object, timeoutMs = 25_000): Promise<string> {
  const config = responsesConfig();
  if (!config) throw new Error("AI gateway is not configured.");
  const response = await fetch(config.endpoint, {
    method: "POST", redirect: "error", cache: "no-store",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({ model: config.model, store: false, ...body }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    // Provider bodies can echo CV text and credentials. Preserve only status.
    throw Object.assign(new Error(`AI provider returned HTTP ${response.status}.`), { status: response.status });
  }
  const parsed = envelope.safeParse(parseJSON(await response.text()));
  if (!parsed.success) throw new SyntaxError("AI provider returned an invalid response.");
  const result = parsed.data;
  if (result.error || (result.status && result.status !== "completed")) throw new SyntaxError("AI provider did not complete the response.");
  const messages = result.output?.filter((item) => item.type === "message" && (!item.role || item.role === "assistant")) ?? [];
  if (messages.some((item) => item.content?.some((part) => part.type === "refusal"))) throw new Error("AI provider declined the request.");
  const text = result.output_text ?? messages.flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("");
  if (!text.trim()) throw new SyntaxError("AI provider returned an empty response.");
  return text;
}

export async function structuredResponse(prompt: string, schema: object, documents: InlineAttachment[], timeoutMs?: number): Promise<unknown> {
  const content: object[] = [{ type: "input_text", text: prompt }];
  documents.forEach((document, index) => content.push(document.mimeType === "application/pdf"
    ? { type: "input_file", filename: `document-${index}.pdf`, file_data: `data:application/pdf;base64,${document.data}` }
    : { type: "input_image", image_url: `data:${document.mimeType};base64,${document.data}` }));
  const text = await request({
    input: [{ role: "user", content }],
    text: { format: { type: "json_schema", name: "ready2work_result", strict: true, schema: strictSchema(schema) } },
  }, timeoutMs);
  return parseJSON(text);
}

export async function chatResponse(systemContext: string, history: ChatTurn[], maxOutputTokens?: number): Promise<string> {
  return request({
    instructions: systemContext,
    input: history.map((turn) => ({ role: turn.role === "model" ? "assistant" : "user", content: turn.text })),
    ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
  });
}
