import "server-only";

export function hasAIKey(): boolean {
  return Boolean(process.env.AI_BASE_URL?.trim()
    ? process.env.AI_API_KEY || process.env.GEMINI_API_KEY
    : process.env.GEMINI_API_KEY);
}

export function responsesConfig() {
  const base = process.env.AI_BASE_URL?.trim();
  if (!base) return null;
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Invalid AI_BASE_URL configuration.");
  }
  // Existing installations keep their server-only key in GEMINI_API_KEY.
  // It is used by a gateway only when AI_BASE_URL explicitly selects one.
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  const model = process.env.AI_MODEL?.trim();
  if (!apiKey || !model) throw new Error("AI API key and AI_MODEL are required for the configured gateway.");
  return { endpoint: `${url.href.replace(/\/+$/, "")}/responses`, apiKey, model };
}
