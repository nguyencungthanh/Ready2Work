import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import manifest from "@/data/source/materials-20261017.json";
import tasks from "@/data/task-rubrics.json";
import type { InlineAttachment } from "@/lib/ai/gemini";

type SourceFile = { id: string; title: string; kind: string; href: string; sha256: string };
type SourceMaterial = { id: string; title: string; kind: string; href?: string };
const source = manifest as { files: SourceFile[]; by_position: Record<string, SourceMaterial[]> };
const fail = () => new Error("Tài liệu nguồn chưa được xác minh đầy đủ. Chưa gửi bài làm sang AI.");

/** Reads only the document's checked-in public image whitelist, never user URLs or answer-key images. */
export async function loadSourceImageAttachments(referenceData: unknown): Promise<{ id: string; title: string; inlineData: InlineAttachment }[]> {
  if (!referenceData || typeof referenceData !== "object" || !("position_id" in referenceData) || typeof referenceData.position_id !== "string") throw fail();
  if (!tasks.industries.some((industry) => industry.tasks.some((task) => task.position_id === referenceData.position_id))) throw fail();
  const expected = source.by_position[referenceData.position_id];
  // Positions without image inputs still exist in the task source; an absent group has no images.
  const images = (expected ?? []).filter((item) => item.kind === "image");
  const actual = "public_materials" in referenceData && Array.isArray(referenceData.public_materials) ? referenceData.public_materials : [];
  const actualImages = actual.filter((item) => item && typeof item === "object" && item.kind === "image");
  if (actualImages.length !== images.length || new Set(actualImages.map((item) => item.id)).size !== images.length || images.some((image) => !actualImages.some((item) => item.id === image.id && item.href === image.href))) throw fail();
  let total = 0;
  const results: { id: string; title: string; inlineData: InlineAttachment }[] = [];
  for (const image of images) {
    const file = source.files.find((item) => item.id === image.id && item.href === image.href && item.kind === "image");
    if (!file || !/^\/materials\/source-20261017\/(?:\d{2}|credit-table-[12])\.png$/.test(file.href) || /\/(?:14|20)\.png$/.test(file.href) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw fail();
    let bytes: Buffer;
    try { bytes = await readFile(path.join(process.cwd(), "public", file.href.slice(1))); }
    catch { throw fail(); }
    total += bytes.length;
    if (total > 15 * 1024 * 1024 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw fail();
    results.push({ id: file.id, title: file.title, inlineData: { data: bytes.toString("base64"), mimeType: "image/png" } });
  }
  return results;
}
