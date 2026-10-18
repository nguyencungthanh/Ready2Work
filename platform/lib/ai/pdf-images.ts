import "server-only";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { InlineAttachment } from "./gemini";
import { MAX_CV_BYTES, MAX_CV_PAGES } from "@/lib/cv/validation";

/** Render every page locally for gateways that accept images but not PDF files. */
export async function pdfPageImages(data: string): Promise<InlineAttachment[]> {
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_CV_BYTES) throw new Error("Invalid PDF size.");
  const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");
  Object.assign(globalThis, { DOMMatrix, ImageData, Path2D });
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const root = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
  const task = getDocument({
    data: new Uint8Array(bytes), useSystemFonts: true,
    disableFontFace: true, verbosity: 0,
    standardFontDataUrl: join(root, "standard_fonts/") + "/",
    cMapUrl: join(root, "cmaps/") + "/", cMapPacked: true,
    wasmUrl: join(root, "wasm/") + "/",
  });
  const images: InlineAttachment[] = [];
  const started = Date.now();
  let totalBytes = 0;
  try {
    const pdf = await task.promise;
    if (!pdf.numPages || pdf.numPages > MAX_CV_PAGES) throw new Error("Invalid PDF page count.");
    for (let number = 1; number <= pdf.numPages; number++) {
      if (Date.now() - started > 10_000) throw new Error("PDF rendering time limit exceeded.");
      const page = await pdf.getPage(number);
      const original = page.getViewport({ scale: 1 });
      // Bound memory even for unusually large page dimensions; preserve all pages.
      const scale = Math.min(2, 2000 / Math.max(original.width, original.height));
      const viewport = page.getViewport({ scale });
      const factory = pdf.canvasFactory as {
        create(width: number, height: number): { canvas: HTMLCanvasElement & { toBuffer(mime: string, quality: number): Buffer }; context: CanvasRenderingContext2D };
        destroy(surface: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }): void;
      };
      const surface = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
      try {
        await page.render({ canvas: surface.canvas, canvasContext: surface.context, viewport }).promise;
        const image: Buffer = surface.canvas.toBuffer("image/jpeg", 90);
        totalBytes += image.length;
        if (totalBytes > 20 * 1024 * 1024) throw new Error("Rendered PDF size limit exceeded.");
        images.push({ mimeType: "image/jpeg", data: image.toString("base64") });
      } finally {
        factory.destroy(surface);
        page.cleanup();
      }
    }
    return images;
  } finally {
    await task.destroy();
  }
}
