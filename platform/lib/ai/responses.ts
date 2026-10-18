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
  choices: z.array(z.object({ finish_reason: z.string().nullable().optional(), message: z.object({ content: z.string().nullable().optional(), refusal: z.string().nullable().optional() }) })).optional(),
});

function parseJSON(text: string): unknown {
  try { return JSON.parse(text); }
  catch { throw new SyntaxError("AI provider returned invalid JSON."); }
}

// Some compatible gateways wrap a valid JSON result in one Markdown fence.
// Normalize only that wrapper; prose and truncated JSON still fail validation.
function parseOutputJSON(text: string): unknown {
  return parseJSON(text.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/, "$1"));
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

async function request(body: object, timeoutMs = 25_000, chat = false): Promise<string> {
  const config = responsesConfig();
  if (!config) throw new Error("AI gateway is not configured.");
  const endpoint = chat ? config.endpoint.replace(/\/responses$/, "/chat/completions") : config.endpoint;
  const response = await fetch(endpoint, {
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
  if (chat) {
    const choice = result.choices?.[0];
    if (choice?.message.refusal) throw new Error("AI provider declined the request.");
    if (choice?.finish_reason && choice.finish_reason !== "stop") throw new SyntaxError("AI provider did not complete the response.");
    if (!choice?.message.content?.trim()) throw new SyntaxError("AI provider returned an empty response.");
    return choice.message.content;
  }
  const messages = result.output?.filter((item) => item.type === "message" && (!item.role || item.role === "assistant")) ?? [];
  if (messages.some((item) => item.content?.some((part) => part.type === "refusal"))) throw new Error("AI provider declined the request.");
  const text = result.output_text ?? messages.flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text").map((part) => part.text ?? "").join("");
  if (!text.trim()) throw new SyntaxError("AI provider returned an empty response.");
  return text;
}

export async function structuredResponse(prompt: string, schema: object, documents: InlineAttachment[], timeoutMs?: number): Promise<unknown> {
  const config = responsesConfig();
  if (config && new URL(config.endpoint).hostname === "api.vilao.ai" && documents.length) {
    const { pdfPageImages } = documents.some((document) => document.mimeType === "application/pdf")
      ? await import("./pdf-images") : { pdfPageImages: undefined };
    const content: object[] = [{ type: "text", text: prompt }];
    for (const document of documents) {
      const images = document.mimeType === "application/pdf" ? await pdfPageImages!(document.data) : [document];
      for (const image of images) content.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } });
    }
    const text = await request({
      messages: [{ role: "system", content: `Return only one JSON object matching this schema, with no commentary: ${JSON.stringify(schema)}` }, { role: "user", content }],
      response_format: { type: "json_schema", json_schema: { name: "ready2work_result", strict: true, schema: strictSchema(schema) } },
    }, timeoutMs, true);
    // This gateway may wrap JSON in one Markdown fence. Accept only that exact
    // wrapper; never salvage free-form prose or incomplete generated JSON.
    return parseOutputJSON(text);
  }
  const content: object[] = [{ type: "input_text", text: prompt }];
  documents.forEach((document, index) => content.push(document.mimeType === "application/pdf"
    ? { type: "input_file", filename: `document-${index}.pdf`, file_data: `data:application/pdf;base64,${document.data}` }
    : { type: "input_image", image_url: `data:${document.mimeType};base64,${document.data}` }));
  const text = await request({
    input: documents.length ? [{ role: "user", content }] : prompt,
    text: { format: { type: "json_schema", name: "ready2work_result", strict: true, schema: strictSchema(schema) } },
  }, timeoutMs);
  return parseOutputJSON(text);
}

export async function chatResponse(systemContext: string, history: ChatTurn[], maxOutputTokens?: number): Promise<string> {
  const config = responsesConfig();
  // Vilao's Responses compatibility does not reliably consume conversation
  // arrays. Use its role-based chat endpoint, also used for source attachments.
  if (config && new URL(config.endpoint).hostname === "api.vilao.ai") {
    return request({
      messages: [{ role: "system", content: systemContext }, ...history.map((turn) => ({
        role: turn.role === "model" ? "assistant" : "user", content: turn.text,
      }))],
      ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
    }, undefined, true);
  }
  return request({
    instructions: systemContext,
    input: history.map((turn) => ({ role: turn.role === "model" ? "assistant" : "user", content: turn.text })),
    ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
  });
}
