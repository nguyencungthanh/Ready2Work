import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";
import { apiError, apiSuccess } from "./response";

type RouteHandler<T> = (request: Request, requestId: string) => Promise<T>;

// Never forward raw error.message from unknown errors to the client - it may
// contain DB/provider internals. Only ApiError/ZodError messages are user-safe.
export function withApiHandler<T>(handler: RouteHandler<T>) {
  return async (request: Request): Promise<NextResponse> => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();

    try {
      const data = await handler(request, requestId);
      return apiSuccess(data, requestId);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiError(error, requestId);
      }
      if (error instanceof ZodError) {
        return apiError(ApiError.fromZodError(error), requestId);
      }

      console.error(
        JSON.stringify({
          level: "error",
          requestId,
          message: "Unhandled route error",
          error: error instanceof Error ? error.message : String(error),
        })
      );
      return apiError(
        new ApiError("INTERNAL_ERROR", "Something went wrong. Please try again."),
        requestId
      );
    }
  };
}
