import { createHash } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log fields per master plan section 27.1. Never pass raw secrets,
 * full request/response bodies, or PII here — hash identifiers with
 * hashUserId() and reference resources by id, not content.
 */
export interface LogFields {
  request_id?: string;
  user_id_hash?: string;
  route?: string;
  domain?: string;
  operation?: string;
  status?: number;
  duration_ms?: number;
  error_code?: string;
  ai_run_id?: string | null;
}

function write(level: LogLevel, message: string, fields: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields: LogFields = {}) => write("debug", message, fields),
  info: (message: string, fields: LogFields = {}) => write("info", message, fields),
  warn: (message: string, fields: LogFields = {}) => write("warn", message, fields),
  error: (message: string, fields: LogFields = {}) => write("error", message, fields),
};

/** One-way hash for user identifiers so logs never carry raw user ids/PII. */
export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}
