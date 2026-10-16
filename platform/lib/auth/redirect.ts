/** Redirects after sign-in must remain inside this application. */
export function safeReturnPath(value: unknown, fallback = "/dashboard"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    && !/[\\\u0000-\u0020]/.test(value) ? value : fallback;
}
