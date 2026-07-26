import { NextResponse } from "next/server";
import type { ApiError, FieldErrors } from "./errors";

export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccessBody<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
  };
  meta: ApiMeta;
}

export function apiSuccess<T>(
  data: T,
  requestId: string,
  init?: { status?: number }
): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json(
    { data, meta: { requestId } },
    { status: init?.status ?? 200 }
  );
}

export function apiError(
  error: ApiError,
  requestId: string
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
      meta: { requestId },
    },
    { status: error.status }
  );
}
