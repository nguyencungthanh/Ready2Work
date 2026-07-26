import type { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { fieldErrors?: FieldErrors }
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = options?.fieldErrors;
  }

  static fromZodError(error: ZodError): ApiError {
    const fieldErrors: FieldErrors = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
      const existing = fieldErrors[key] ?? [];
      existing.push(issue.message);
      fieldErrors[key] = existing;
    }
    return new ApiError("VALIDATION_ERROR", "Some fields are invalid.", {
      fieldErrors,
    });
  }
}
