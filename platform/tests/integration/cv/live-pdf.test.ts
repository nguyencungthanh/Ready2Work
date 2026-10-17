import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { extractCVDocument } from "@/lib/cv/extract";

// Explicit opt-in only. Never copy a personal CV into the repository or log its text.
const sample = process.env.R2W_CV_SAMPLE_FILE;
test.skipIf(process.env.R2W_RUN_LIVE_CV !== "1" || !sample)("recognizes an approved image PDF without saving account data", async () => {
  const bytes = await readFile(sample!);
  const extracted = await extractCVDocument(new File([new Uint8Array(bytes)], "approved-sample.pdf", { type: "application/pdf" }));
  expect(extracted.method).toBe("pdf-ocr");
  expect(extracted.text.length).toBeGreaterThan(100);
  console.info(JSON.stringify({ method: extracted.method, characters: extracted.text.length }));
}, 60_000);
