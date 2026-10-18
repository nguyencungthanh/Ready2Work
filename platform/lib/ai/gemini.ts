import "server-only";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
let sharedClient: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  sharedClient ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 25_000 } });
  return sharedClient;
}

/**
 * Calls Gemini with a JSON schema and returns the parsed response. No
 * redaction/quota infrastructure here by design (early-stage, free tier) -
 * callers are responsible for validating the shape with Zod before trusting
 * it (plan section 19.5: never show unvalidated AI output).
 */
export async function generateStructured(
  prompt: string,
  responseSchema: object,
  document?: InlineAttachment | InlineAttachment[],
  options?: { timeoutMs?: number },
): Promise<unknown> {
  const client = getClient();
  const documents = document ? Array.isArray(document) ? document : [document] : [];

  const response = await client.models.generateContent({
    model: MODEL,
    contents: documents.length ? [{ text: prompt }, ...documents.map((inlineData) => ({ inlineData }))] : prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      ...(options?.timeoutMs ? { httpOptions: { timeout: options.timeoutMs } } : {}),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
}

export interface InlineAttachment { data: string; mimeType: "application/pdf" | "image/png" | "image/jpeg" }

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Calls Gemini for a plain-text conversational reply (roadmap chatbot). */
export async function generateChatReply(
  systemContext: string,
  history: ChatTurn[],
  options?: { maxOutputTokens?: number },
): Promise<string> {
  const client = getClient();

  const chat = client.chats.create({
    model: MODEL,
    history: history.slice(0, -1).map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    config: {
      systemInstruction: systemContext,
      ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  });

  const last = history[history.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("Chat history must end with a user turn.");
  }

  const response = await chat.sendMessage({ message: last.text });
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
