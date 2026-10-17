import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth/error-message";

describe("authentication error messages", () => {
  it("keeps invalid credentials generic while distinguishing service failures", () => {
    expect(authErrorMessage({ code: "invalid_credentials", status: 400 })).toContain("Email hoặc mật khẩu");
    expect(authErrorMessage({ status: 503 })).toContain("kết nối");
    expect(authErrorMessage({ name: "AuthRetryableFetchError" })).toContain("kết nối");
    expect(authErrorMessage({ code: "email_not_confirmed", status: 400 })).toContain("chưa được xác thực");
    expect(authErrorMessage({ status: 429 })).toContain("quá nhiều");
  });

  it.each(["signup", "reset"] as const)("explains exhausted email quota for %s even when the provider also returns 429", (purpose) => {
    const message = authErrorMessage({ code: "over_email_send_rate_limit", status: 429 }, purpose);
    expect(message).toBe("Dịch vụ tài khoản đã hết hạn mức gửi email. Vui lòng thử lại sau.");
    expect(message).not.toBe(authErrorMessage({ status: 429 }, purpose));
  });

  it("preserves the generic rate-limit message for request limits and unclassified 429 responses", () => {
    const message = "Có quá nhiều yêu cầu. Vui lòng đợi một lúc rồi thử lại.";
    expect(authErrorMessage({ code: "over_request_rate_limit", status: 429 })).toBe(message);
    expect(authErrorMessage({ status: 429 })).toBe(message);
  });
});
