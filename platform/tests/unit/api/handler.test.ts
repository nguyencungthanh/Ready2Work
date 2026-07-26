import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", { headers });
}

describe("withApiHandler", () => {
  it("returns a success envelope when the handler resolves", async () => {
    const route = withApiHandler(async () => ({ ok: true }));
    const response = await route(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ ok: true });
    expect(body.meta.requestId).toBeTruthy();
  });

  it("reuses an incoming x-request-id header instead of generating one", async () => {
    const route = withApiHandler(async () => ({ ok: true }));
    const response = await route(makeRequest({ "x-request-id": "fixed-id" }));
    const body = await response.json();

    expect(body.meta.requestId).toBe("fixed-id");
  });

  it("maps a thrown ApiError to its error envelope and status", async () => {
    const route = withApiHandler(async () => {
      throw new ApiError("NOT_FOUND", "Resource not found.");
    });
    const response = await route(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("maps a thrown ZodError to a VALIDATION_ERROR envelope", async () => {
    const schema = z.object({ email: z.string().email() });
    const route = withApiHandler(async () => {
      schema.parse({ email: "invalid" });
      return {};
    });
    const response = await route(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fieldErrors?.email).toBeDefined();
  });

  it("never leaks internal error details for unexpected errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = withApiHandler(async () => {
      throw new Error("db connection string: postgres://user:pass@host/db");
    });
    const response = await route(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toContain("postgres://");
    consoleSpy.mockRestore();
  });
});
