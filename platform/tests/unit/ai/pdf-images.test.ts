import { expect, it } from "vitest";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { pdfPageImages } from "@/lib/ai/pdf-images";

it("renders every page in order including embedded image content, with bounded JPEG dimensions", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]).drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: rgb(1, 0, 0) });
  const blue = await sharp({ create: { width: 600, height: 800, channels: 3, background: "blue" } }).png().toBuffer();
  const image = await pdf.embedPng(blue);
  pdf.addPage([600, 800]).drawImage(image, { x: 0, y: 0, width: 600, height: 800 });
  const images = await pdfPageImages(Buffer.from(await pdf.save()).toString("base64"));
  expect(images).toHaveLength(2);
  for (const [index, page] of images.entries()) {
    expect(page.mimeType).toBe("image/jpeg");
    const bytes = Buffer.from(page.data, "base64");
    const metadata = await sharp(bytes).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(1600);
    const { channels } = await sharp(bytes).stats();
    expect(channels[index === 0 ? 0 : 2]!.mean).toBeGreaterThan(240);
    expect(channels[index === 0 ? 2 : 0]!.mean).toBeLessThan(10);
  }
});

it("rejects oversized PDFs and documents beyond the supported page count", async () => {
  await expect(pdfPageImages(Buffer.alloc(3_145_729).toString("base64"))).rejects.toThrow("size");
  const pdf = await PDFDocument.create();
  for (let index = 0; index < 16; index++) pdf.addPage();
  await expect(pdfPageImages(Buffer.from(await pdf.save()).toString("base64"))).rejects.toThrow("page count");
});
