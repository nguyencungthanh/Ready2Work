import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { apiError, apiSuccess } from "@/lib/api/response";

describe("apiSuccess", () => {
  it("wraps data in the { data, meta } envelope", async () => {
    const response = apiSuccess({ foo: "bar" }, "req-1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ data: { foo: "bar" }, meta: { requestId: "req-1" } });
  });

  it("honors a custom status code", () => {
    const response = apiSuccess({ id: "1" }, "req-2", { status: 201 });
    expect(response.status).toBe(201);
  });
});

describe("apiError", () => {
  it("wraps an ApiError in the { error, meta } envelope with its mapped status", async () => {
    const error = new ApiError("FORBIDDEN", "Not allowed.");
    const response = apiError(error, "req-3");
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: { code: "FORBIDDEN", message: "Not allowed." },
      meta: { requestId: "req-3" },
    });
  });

  it("includes fieldErrors when present", async () => {
    const error = new ApiError("VALIDATION_ERROR", "Some fields are invalid.", {
      fieldErrors: { email: ["Enter a valid email address."] },
    });
    const response = apiError(error, "req-4");
    const body = await response.json();

    expect(body.error.fieldErrors).toEqual({
      email: ["Enter a valid email address."],
    });
  });
});
