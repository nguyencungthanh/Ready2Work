import { describe, expect, it } from "vitest";
import { interviewSpeechSegments } from "@/lib/interview/speech";

describe("interview question speech language", () => {
  it("keeps Vietnamese narration in Vietnamese", () => {
    const prompt = "Khi số liệu giữa các phòng ban không khớp, bạn xử lý thế nào?";
    const segments = interviewSpeechSegments(prompt);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.every((segment) => segment.lang === "vi-VN")).toBe(true);
    expect(segments.map((segment) => segment.text).join("")).toBe(prompt);
  });

  it("reads English terms within a Vietnamese question with English pronunciation, preserving the exact question", () => {
    const prompt = "Bạn hãy phân biệt Testing và Quality Assurance";
    const segments = interviewSpeechSegments(prompt);
    expect(segments.map((segment) => segment.text).join("")).toBe(prompt);
    for (const term of ["Testing", "Quality Assurance"]) {
      expect(segments.some((segment) => segment.lang === "en-US" && segment.text.includes(term))).toBe(true);
    }
    expect(segments.some((segment) => segment.lang === "vi-VN" && segment.text.includes("phân biệt"))).toBe(true);
  });

  it("does not add, translate or remove source words, numbers and punctuation", () => {
    const prompt = "Giải thích 3 chỉ số: EBITDA, ROA, ROE; tại sao cần kiểm tra dòng tiền?";
    expect(interviewSpeechSegments(prompt).map((segment) => segment.text).join("")).toBe(prompt);
    expect(interviewSpeechSegments("")).toEqual([]);
  });
});
