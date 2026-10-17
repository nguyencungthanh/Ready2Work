import { z } from "zod";

// Password rules from master plan section 8.6.
const passwordSchema = z
  .string()
  .min(12, "Mật khẩu cần ít nhất 12 ký tự")
  .regex(/[a-z]/, "Mật khẩu cần có chữ thường")
  .regex(/[A-Z]/, "Mật khẩu cần có chữ hoa")
  .regex(/[0-9]/, "Mật khẩu cần có chữ số");

export const signUpSchema = z
  .object({
    email: z.string().trim().email("Nhập địa chỉ email hợp lệ"),
    password: passwordSchema,
    confirmPassword: z.string(),
    displayName: z.string().trim().min(1, "Nhập tên của bạn").max(80, "Tên không được dài quá 80 ký tự"),
    acceptTerms: z.literal(true, {
      error: "Bạn cần đồng ý điều khoản để tiếp tục",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận chưa khớp",
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Nhập địa chỉ email hợp lệ"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Nhập địa chỉ email hợp lệ"),
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận chưa khớp",
  });

export const roleApplicationSchema = z.object({
  requestedRole: z.enum(["mentor", "employer_member"]),
  justification: z.string().min(20, "Vui lòng trình bày thêm, ít nhất 20 ký tự").max(2000),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
