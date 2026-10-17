import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("@/lib/ai/gemini", () => ({ generateStructured: vi.fn() }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});
import { readFile } from "node:fs/promises";
import { generateStructured } from "@/lib/ai/gemini";
import tasks from "@/data/task-rubrics.json";
import manifest from "@/data/source/materials-20261017.json";
import { loadSourceImageAttachments } from "@/lib/simulation/source-attachments";
import { evaluateCurrentSource } from "@/lib/simulation/source-evaluator";
interface SourceTaskFixture { position_id: string; context: string; requirements: string[]; rubric: { criterion_id: string; description: string; checklist: { checklist_id: string; scoring_source?: string }[] }[] }
const task = (tasks as unknown as { industries: { tasks: SourceTaskFixture[] }[] }).industries.flatMap((industry) => industry.tasks).find((item) => item.position_id === "IT-01")!;
function zeroResult(input = task) { return { summary: "Bài làm chưa có bằng chứng.", checklists: input.rubric.flatMap((criterion) => criterion.checklist).filter((item) => item.scoring_source !== "system").map((item) => ({ checklistId: item.checklist_id, awardedPoints: 0, evidence: "", reason: "Chưa có bằng chứng trong bài làm." })), criterionFeedback: input.rubric.map((criterion) => ({ criterionId: criterion.criterion_id, feedback: "Cần trình bày nội dung theo yêu cầu." })) }; }
beforeEach(() => { vi.mocked(readFile).mockClear(); vi.mocked(generateStructured).mockReset(); });

describe("verified source images for Gemini", () => {
  it("sends the exact original PNG bytes with full source criterion descriptions", async () => {
    vi.mocked(generateStructured).mockResolvedValue(zeroResult());
    await evaluateCurrentSource("Chưa có nội dung phân tích.", task.context, task.requirements.join("\n"), task, 10);
    const [prompt, , input] = vi.mocked(generateStructured).mock.calls[0]!;
    expect(prompt.includes(task.context)).toBe(true);
    for (const criterion of task.rubric) expect(prompt.includes(JSON.stringify(criterion.description))).toBe(true);
    expect(Array.isArray(input)).toBe(true);
    const images = Array.isArray(input) ? input : [];
    expect(images).toHaveLength(1);
    expect(images[0]?.mimeType).toBe("image/png");
    const digest = createHash("sha256").update(Buffer.from(images[0]!.data, "base64")).digest("hex");
    expect(digest === manifest.files.find((file) => file.id === "source-0")?.sha256).toBe(true);
  });
  it("stops before AI for missing files, changed SHA, absent source materials or injected URLs", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error("not found"));
    await expect(evaluateCurrentSource("Nội dung", task.context, "Đề bài", task, 10)).rejects.toThrow("chưa được xác minh");
    vi.mocked(readFile).mockResolvedValueOnce(Buffer.from("modified bytes"));
    await expect(loadSourceImageAttachments(task)).rejects.toThrow("chưa được xác minh");
    await expect(loadSourceImageAttachments({ ...task, public_materials: [] })).rejects.toThrow("chưa được xác minh");
    await expect(loadSourceImageAttachments({ ...task, public_materials: [{ id: "source-0", kind: "image", href: "https://outside.invalid/cv.png" }] })).rejects.toThrow("chưa được xác minh");
    expect(generateStructured).not.toHaveBeenCalled();
  });
  it("keeps both QA images aligned with the corresponding prompt titles and SHA values", async () => {
    const qa = (tasks as unknown as { industries: { tasks: SourceTaskFixture[] }[] }).industries.flatMap((industry) => industry.tasks).find((item) => item.position_id === "IT-02")!;
    vi.mocked(generateStructured).mockResolvedValue(zeroResult(qa));
    await evaluateCurrentSource("Chưa có nội dung phân tích.", qa.context, qa.requirements.join("\n"), qa, 10);
    const [prompt, , payload] = vi.mocked(generateStructured).mock.calls[0]!;
    const images = Array.isArray(payload) ? payload : [];
    expect(images).toHaveLength(2);
    for (const [index, id] of ["source-1", "source-2"].entries()) {
      const file = manifest.files.find((item) => item.id === id)!;
      expect(prompt.includes(`${index + 1}. ${file.title} (${id})`)).toBe(true);
      expect(createHash("sha256").update(Buffer.from(images[index]!.data, "base64")).digest("hex") === file.sha256).toBe(true);
    }
  });
  it("does not load answer-key, feedback, CV or unknown-position files", async () => {
    await expect(loadSourceImageAttachments({ position_id: "IT-01", public_materials: [{ id: "source-14", kind: "image", href: "/materials/source-20261017/14.png" }] })).rejects.toThrow();
    await expect(loadSourceImageAttachments({ position_id: "UNKNOWN", public_materials: [] })).rejects.toThrow();
    expect(readFile).not.toHaveBeenCalled();
  });
});
