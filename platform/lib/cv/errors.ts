export type CVAnalysisErrorCode = "CV_INVALID_RESPONSE" | "CV_INCOMPLETE_ANALYSIS" | "CV_INVALID_EVIDENCE";

/** Contains only safe diagnostic codes/requirement IDs, never model output. */
export class CVAnalysisError extends Error {
  constructor(public readonly code: CVAnalysisErrorCode, public readonly requirementIds: string[] = []) {
    super(code);
    this.name = "CVAnalysisError";
  }
}

export function cvErrorDetails(error: unknown): { error_code: string; status?: number } {
  if (error instanceof CVAnalysisError) return { error_code: error.code };
  const status = typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
    ? error.status : undefined;
  if (status === 401 || status === 403) return { error_code: "CV_AI_AUTH", status };
  if (status === 429) return { error_code: "CV_AI_QUOTA", status };
  if (status === 503) return { error_code: "CV_AI_UNAVAILABLE", status };
  if (status === 504 || (error instanceof Error && /^(AbortError|TimeoutError)$/.test(error.name))) {
    return { error_code: "CV_AI_TIMEOUT", status };
  }
  return { error_code: status ? "CV_AI_PROVIDER_ERROR" : "CV_PROCESSING_FAILED", status };
}
