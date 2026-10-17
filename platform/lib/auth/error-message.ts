export function authErrorMessage(error: { code?: string; status?: number; name?: string } | null | undefined, purpose: "signin" | "signup" | "password" | "reset" = "signin"): string {
  if (error?.code === "email_not_confirmed") return "Email chưa được xác thực. Hãy mở email xác nhận trước khi đăng nhập.";
  if (error?.code === "over_email_send_rate_limit") return "Dịch vụ tài khoản đã hết hạn mức gửi email. Vui lòng thử lại sau.";
  if (error?.code === "over_request_rate_limit" || error?.status === 429) return "Có quá nhiều yêu cầu. Vui lòng đợi một lúc rồi thử lại.";
  if (error?.code === "weak_password") return "Mật khẩu chưa đáp ứng yêu cầu. Hãy kiểm tra các yêu cầu trên biểu mẫu.";
  if (error?.code === "same_password") return "Mật khẩu mới cần khác mật khẩu hiện tại.";
  if (error?.code === "email_address_not_authorized") return "Dịch vụ email hiện chưa cho phép gửi đến địa chỉ này. Vui lòng thử lại sau.";
  if (error?.code === "invalid_credentials" || (purpose === "signin" && error?.status === 400)) return "Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.";
  if (error?.name === "AuthRetryableFetchError" || !error?.status || error.status >= 500) return "Chưa kết nối được dịch vụ tài khoản. Vui lòng kiểm tra mạng và thử lại.";
  return { signin: "Chưa đăng nhập được lúc này. Vui lòng thử lại.", signup: "Chưa tạo được tài khoản lúc này. Vui lòng thử lại.", password: "Chưa cập nhật được mật khẩu. Vui lòng thử lại.", reset: "Chưa gửi được yêu cầu đặt lại mật khẩu. Vui lòng thử lại." }[purpose];
}
