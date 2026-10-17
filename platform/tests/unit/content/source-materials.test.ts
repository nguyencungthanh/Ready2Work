import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/data/source/materials-20261017.json";

describe("source document materials", () => {
  it("ships the exact twenty approved original images recorded in the source manifest", async () => {
    expect(manifest.files).toHaveLength(20);
    expect(new Set(manifest.files.map((file) => file.href)).size).toBe(20);
    for (const file of manifest.files) {
      expect(file.href).toMatch(/^\/materials\/source-20261017\/[\w-]+\.png$/);
      expect(file.source_url).toMatch(/^https:\/\/drive\.google\.com\/file\/d\//);
      expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
      const bytes = await readFile(resolve(process.cwd(), "public", file.href.slice(1)));
      expect(createHash("sha256").update(bytes).digest("hex"), file.href).toBe(file.sha256);
    }
  });

  it("keeps the two worked-answer benchmark images outside public materials", async () => {
    for (const name of ["14.png", "20.png"]) {
      const href = `/materials/source-20261017/${name}`;
      expect(manifest.files.some((file) => file.href === href)).toBe(false);
      await expect(access(resolve(process.cwd(), "public", href.slice(1)))).rejects.toMatchObject({ code: "ENOENT" });
    }
  });

  it("pairs all three finance assignments with their complete source document set and editable source worksheet", () => {
    const expectedImages = {
      "TCNH-01": ["source-10", "source-11", "source-12"],
      "TCNH-02": ["source-3", "source-4", "source-5", "source-6", "source-7", "source-8"],
      "TCNH-03": ["source-15", "source-16", "source-17", "source-18"],
    };
    for (const [position, expected] of Object.entries(expectedImages)) {
      const materials = manifest.by_position[position as keyof typeof manifest.by_position];
      expect(materials.filter((material) => material.kind === "image").map((material) => material.id)).toEqual(expected);
      expect(materials.some((material) => material.kind === "table" && "editable" in material && material.editable)).toBe(true);
      for (const material of materials) {
        if ("href" in material) expect(manifest.files.some((file) => file.href === material.href)).toBe(true);
      }
    }
  });
});
