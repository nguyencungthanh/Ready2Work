import { expect, it, vi } from "vitest";
vi.mock("@/lib/ai/gemini", () => ({ generateChatReply: vi.fn(async () => "Synthetic reply") }));
import { generateChatReply } from "@/lib/ai/gemini";
import { replyToRoadmapChat, type RoadmapChatMessage } from "@/lib/roadmap/chat";

it("bounds long roadmap conversations while keeping recent complete pairs and the current question", async () => {
  const history: RoadmapChatMessage[] = Array.from({ length: 100 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `${i}:` + "a".repeat(3000) }));
  history.push({ role: "user", content: "Current question" });
  await replyToRoadmapChat({ title: "QA", industry: "IT", key_skills: ["Testing"] }, [], history);
  const [, turns, options] = vi.mocked(generateChatReply).mock.calls.at(-1)!;
  expect(turns.at(-1)?.text).toBe("Current question");
  expect(turns.length).toBeLessThanOrEqual(11);
  expect(turns.reduce((sum, turn) => sum + turn.text.length, 0)).toBeLessThanOrEqual(16_000);
  expect(turns.every((turn, i) => turn.role === (i % 2 ? "model" : "user"))).toBe(true);
  expect(options).toEqual({ maxOutputTokens: 1200 });
});
