import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/observability/logger";
import { ApiError } from "./errors";
import { apiError, apiSuccess } from "./response";

type RouteHandler<T> = (request: Request, requestId: string) => Promise<T>;

// Never forward raw error.message from unknown errors to the client - it may
// contain DB/provider internals. Only ApiError/ZodError messages are user-safe.
export function withApiHandler<T>(handler: RouteHandler<T>) {
  return async (request: Request): Promise<NextResponse> => {
    const requestId = request.headers.get("x-request-id") ?? randomUUID();
    const route = new URL(request.url).pathname;
    const startedAt = performance.now();

    const logOutcome = (status: number, errorCode?: string) => {
      logger.info("api_request", {
        request_id: requestId,
        route,
        status,
        duration_ms: Math.round(performance.now() - startedAt),
        ...(errorCode ? { error_code: errorCode } : {}),
      });
    };

    try {
      const data = await handler(request, requestId);
      const response = apiSuccess(data, requestId);
      logOutcome(response.status);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        const response = apiError(error, requestId);
        logOutcome(response.status, error.code);
        return response;
      }
      if (error instanceof ZodError) {
        const apiErrorInstance = ApiError.fromZodError(error);
        const response = apiError(apiErrorInstance, requestId);
        logOutcome(response.status, apiErrorInstance.code);
        return response;
      }

      logger.error("unhandled_route_error", {
        request_id: requestId,
        route,
        error_code: "INTERNAL_ERROR",
      });
      const response = apiError(
        new ApiError("INTERNAL_ERROR", "Something went wrong. Please try again."),
        requestId
      );
      logOutcome(response.status, "INTERNAL_ERROR");
      return response;
    }
  };
}
