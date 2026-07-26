import { afterEach, describe, expect, it, vi } from "vitest";
import { hashUserId, logger } from "@/lib/observability/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes info/debug/warn as structured JSON via console.log/warn", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("something_happened", { route: "/api/health", status: 200 });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(entry).toMatchObject({
      level: "info",
      message: "something_happened",
      route: "/api/health",
      status: 200,
    });
    expect(entry.timestamp).toBeTruthy();
  });

  it("writes warn via console.warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("slow_request", { duration_ms: 5000 });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(warnSpy.mock.calls[0]?.[0] as string);
    expect(entry.level).toBe("warn");
  });

  it("writes error via console.error", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("unhandled_route_error", { error_code: "INTERNAL_ERROR" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(errorSpy.mock.calls[0]?.[0] as string);
    expect(entry).toMatchObject({ level: "error", error_code: "INTERNAL_ERROR" });
  });

  it("never includes fields other than what was passed plus timestamp/level/message", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("event", { request_id: "abc" });

    const entry = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(Object.keys(entry).sort()).toEqual(
      ["level", "message", "request_id", "timestamp"].sort()
    );
  });
});

describe("hashUserId", () => {
  it("produces a deterministic, non-reversible-looking hash", () => {
    const hash1 = hashUserId("user-123");
    const hash2 = hashUserId("user-123");
    expect(hash1).toBe(hash2);
    expect(hash1).not.toContain("user-123");
    expect(hash1).toHaveLength(16);
  });

  it("produces different hashes for different ids", () => {
    expect(hashUserId("user-1")).not.toBe(hashUserId("user-2"));
  });
});
