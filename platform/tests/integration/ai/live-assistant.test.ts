import { expect, test } from "vitest";
import { generateChatReply, type ChatTurn } from "@/lib/ai/gemini";
import { DASHBOARD_ASSISTANT_CONTEXT } from "@/lib/assistant/context";

// Deployment opt-in: synthetic questions only, no account data or answer logs.
test.skipIf(process.env.R2W_RUN_LIVE_ASSISTANT !== "1")("answers the latest question and remembers synthetic conversation context", async () => {
  const history: ChatTurn[] = [{ role: "user", text: "Mình muốn làm QA. Smoke testing khác regression testing thế nào? Trả lời ngắn gọn." }];
  const first = await generateChatReply(DASHBOARD_ASSISTANT_CONTEXT, history, { maxOutputTokens: 1200 });
  expect(first.toLowerCase()).toMatch(/smoke/);
  expect(first.toLowerCase()).toMatch(/regression/);
  expect(first).not.toContain("/roadmap/cv");
  history.push({ role: "model", text: first }, { role: "user", text: "Nhắc lại đúng tên hai loại kiểm thử mình vừa hỏi, không cần giải thích hay giới thiệu tính năng." });
  const second = await generateChatReply(DASHBOARD_ASSISTANT_CONTEXT, history, { maxOutputTokens: 1200 });
  expect(second.toLowerCase()).toMatch(/smoke/);
  expect(second.toLowerCase()).toMatch(/regression/);
  expect(second).not.toMatch(/\/roadmap\/cv|\/simulations|\/interviews|\/report/);
}, 60_000);
