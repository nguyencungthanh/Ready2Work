import "server-only";
import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return new GoogleGenAI({ apiKey });
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
): Promise<unknown> {
  const client = getClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Calls Gemini for a plain-text conversational reply (roadmap chatbot). */
export async function generateChatReply(
  systemContext: string,
  history: ChatTurn[],
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
