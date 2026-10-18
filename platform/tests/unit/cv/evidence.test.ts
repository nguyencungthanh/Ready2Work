import { describe, expect, it } from "vitest";
import { cvExcerpts } from "@/lib/cv/evidence";

describe("CV evidence source segmentation", () => {
  it("keeps exact sentences, Unicode, punctuation and PDF whitespace", () => {
    const text = "  Kinh nghiệm: SQL\t  và Excel.\r\n\nTôi lập báo cáo. Tôi phân tích dữ liệu.\n";
    const excerpts = cvExcerpts(text);
    expect(excerpts.map((excerpt) => excerpt.text)).toEqual(["Kinh nghiệm: SQL\t  và Excel.", "Tôi lập báo cáo.", "Tôi phân tích dữ liệu."]);
    expect(excerpts.every((excerpt) => text.includes(excerpt.text))).toBe(true);
    expect(new Set(excerpts.map((excerpt) => excerpt.id)).size).toBe(excerpts.length);
  });
  it("bounds very long lines without losing content or splitting emoji", () => {
    const text = "a".repeat(599) + "🚀" + "b".repeat(1200);
    const excerpts = cvExcerpts(text);
    expect(excerpts.every((excerpt) => excerpt.text.length <= 600 && text.includes(excerpt.text))).toBe(true);
    expect(excerpts.map((excerpt) => excerpt.text).join("")).toBe(text);
    expect(excerpts.every((excerpt) => !/^\p{Surrogate}|\p{Surrogate}$/u.test(excerpt.text))).toBe(true);
  });
  it("retains every non-whitespace character across long natural-language lines", () => {
    const text = "Kỹ năng SQL và lập báo cáo Excel, ".repeat(1300);
    expect(cvExcerpts(text).map((excerpt) => excerpt.text).join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
});
