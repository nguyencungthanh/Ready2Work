import { expect, it } from "vitest";
import { practiceDeadline, practiceExpired, practiceRemaining, formatPracticeTime } from "@/lib/practice-time";
const start = "2026-10-19T00:00:00Z";
const deadline = Date.parse("2026-10-19T01:00:00Z");
it("expires exactly at one hour and never counts past zero", () => {
  expect(practiceDeadline(start)).toBe(deadline);
  expect(practiceExpired(start, deadline-1)).toBe(false);
  expect(practiceExpired(start, deadline)).toBe(true);
  expect(practiceRemaining(start, deadline-1)).toBe(1);
  expect(practiceRemaining(start, deadline)).toBe(0);
  expect(practiceRemaining(start, deadline+3_600_000)).toBe(0);
  expect(formatPracticeTime(3600)).toBe("01:00:00");
  expect(formatPracticeTime(0)).toBe("00:00:00");
});
it("fails closed for invalid timestamps and caps a future clock at 60 minutes", () => {
  expect(practiceExpired("invalid")).toBe(true);
  expect(practiceRemaining("invalid")).toBe(0);
  expect(practiceRemaining(start, Date.parse(start)-10_000)).toBe(3600);
});
