import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";

describe("ApiError", () => {
  it("maps a known code to its HTTP status", () => {
    const error = new ApiError("NOT_FOUND", "Resource not found.");
    expect(error.status).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
  });

  it("builds a VALIDATION_ERROR with grouped field errors from a ZodError", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    if (result.success) throw new Error("expected validation failure");

    const error = ApiError.fromZodError(result.error);

    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.status).toBe(400);
    expect(error.fieldErrors?.email).toBeDefined();
    expect(error.fieldErrors?.email?.length).toBeGreaterThan(0);
  });

  it("groups multiple issues for the same field under one key", () => {
    const schema = z.object({
      password: z.string().min(8).regex(/[0-9]/),
    });
    const result = schema.safeParse({ password: "abc" });
    if (result.success) throw new Error("expected validation failure");

    const error = ApiError.fromZodError(result.error);

    expect(error.fieldErrors?.password?.length).toBeGreaterThanOrEqual(2);
  });

  it("uses _root for issues without a field path", () => {
    const schema = z.string().min(1);
    const result = schema.safeParse("");
    if (result.success) throw new Error("expected validation failure");

    const error = ApiError.fromZodError(result.error);

    expect(error.fieldErrors?._root).toBeDefined();
  });
});
