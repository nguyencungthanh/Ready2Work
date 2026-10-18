import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractCVDocument } from "@/lib/cv/extract";
import { analyzeCV } from "@/lib/cv/analyzer";
import { getGoldenProfile } from "@/lib/content/catalog";

// Explicit opt-in only. Never copy a personal CV into the repository or log its text.
const sample = process.env.R2W_CV_SAMPLE_FILE;
test.skipIf(process.env.R2W_RUN_LIVE_CV !== "1" || !sample)("recognizes an approved image PDF without saving account data", async () => {
  const bytes = await readFile(sample!);
  const extracted = await extractCVDocument(new File([new Uint8Array(bytes)], "approved-sample.pdf", { type: "application/pdf" }));
  expect(extracted.method).toBe("pdf-ocr");
  expect(extracted.text.length).toBeGreaterThan(100);
  console.info(JSON.stringify({ method: extracted.method, characters: extracted.text.length }));
}, 120_000);

// Contains only synthetic professional content, with no personal/contact data.
async function syntheticPdf(kind: "scan" | "mixed" | "multi-page") {
  const sharp = (await import("sharp")).default;
  const lines = [
    "SYNTHETIC CV - NO PERSONAL DATA",
    "TECHNICAL SKILLS",
    "Python, SQL, PostgreSQL, Pandas, Excel",
    "PROJECT EXPERIENCE",
    "Built data pipelines using Pandas and SQL.",
    "Prepared monthly dashboards in Excel.",
    "Communicated findings to project stakeholders.",
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1300"><rect width="100%" height="100%" fill="white"/>${lines.map((line, index) => `<text x="60" y="${90 + index * 85}" font-size="30" font-family="sans-serif" fill="black">${line}</text>`).join("")}</svg>`;
  const image = await sharp(Buffer.from(svg)).png().toBuffer();
  const pdf = await PDFDocument.create();
  const png = await pdf.embedPng(image);
  if (kind === "multi-page") {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage([600, 800]).drawText("SYNTHETIC EDUCATION: Completed a business analytics training project.", { x: 30, y: 740, font, size: 10 });
  }
  const page = pdf.addPage([600, 800]);
  if (kind === "mixed") {
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("SYNTHETIC EDUCATION: Completed a business analytics training project.", { x: 30, y: 770, font, size: 10 });
  }
  page.drawImage(png, { x: 0, y: 0, width: 600, height: 740 });
  return new File([new Uint8Array(await pdf.save())], `${kind}.pdf`, { type: "application/pdf" });
}

test.skipIf(process.env.R2W_RUN_LIVE_CV !== "1").each(["scan", "mixed", "multi-page"] as const)(
  "reads a synthetic %s PDF through real Gemini without losing image sections",
  async (kind) => {
    const started = Date.now();
    const extracted = await extractCVDocument(await syntheticPdf(kind));
    expect(extracted.method).toBe("pdf-ocr");
    expect(extracted.text).toContain("PostgreSQL");
    expect(extracted.text).toContain("Pandas");
    if (kind !== "scan") expect(extracted.text).toContain("EDUCATION");
    console.info(JSON.stringify({ kind, method: extracted.method, characters: extracted.text.length, elapsedMs: Date.now() - started }));
  }, 150_000,
);

test.skipIf(process.env.R2W_RUN_LIVE_CV !== "1")("analyzes synthetic recognized CV text through real Gemini", async () => {
  const profile = getGoldenProfile("IT-01");
  expect(profile).toBeDefined();
  const text = "SYNTHETIC CV - NO PERSONAL DATA. Technical skills: Python, SQL, PostgreSQL, Pandas, Excel. Built data pipelines using Pandas and SQL. Prepared monthly dashboards in Excel. Communicated findings to project stakeholders.";
  const analysis = await analyzeCV(text, profile!);
  expect(analysis.provider).toBe("ai");
  expect(analysis.strengths.length + analysis.skillGaps.length).toBeGreaterThan(0);
}, 90_000);
