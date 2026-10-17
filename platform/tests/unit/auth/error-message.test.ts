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
});
