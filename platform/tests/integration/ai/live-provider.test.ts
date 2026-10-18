import { expect, test } from "vitest";
import { generateChatReply } from "@/lib/ai/gemini";

// Explicit deployment opt-in. No account data, CVs or provider response logging.
test.skipIf(process.env.R2W_RUN_LIVE_AI !== "1")("answers a synthetic conversation through the configured provider", async () => {
  const reply = await generateChatReply("Deployment diagnostic using synthetic data only. Reply with OK.", [{ role: "user", text: "Hello" }]);
  expect(reply.trim().length).toBeGreaterThan(0);
}, 35_000);
