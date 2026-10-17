"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { AuthForm } from "../auth-form";
import { signInAction } from "../actions";
export function SigninView({ next, error }: { next?:string;error?:string }) {
 const [business,setBusiness]=useState(Boolean(next?.startsWith("/business")));
 const linkError = error === "service_unavailable" ? "Chưa kết nối được dịch vụ tài khoản. Vui lòng kiểm tra mạng và gửi lại yêu cầu nếu liên kết không mở được." : error === "browser_context_missing" ? "Không tìm thấy phiên yêu cầu xác thực trên trình duyệt này. Hãy gửi lại yêu cầu và mở liên kết mới nhất trên cùng trình duyệt, cùng thiết bị đã gửi yêu cầu; không mở bằng cửa sổ ẩn danh." : "Liên kết không hợp lệ, đã được sử dụng hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới và chỉ mở liên kết mới nhất.";
 return <main><div className="ob-logo-row"><Brand/></div><h1 className="ob-title">Đăng nhập tài khoản</h1><p className="ob-sub">Chọn vai trò và nhập thông tin để truy cập không gian làm việc của bạn.</p><div className="login-seg-wrap">{[true,false].map(b=><button key={String(b)} type="button" className={`login-seg-btn ${business===b?"active":""}`} onClick={()=>setBusiness(b)}>{b?"Tôi là Doanh nghiệp":"Tôi là Sinh viên"}</button>)}</div>{error&&<p role="alert" className="auth-error">{linkError}</p>}<AuthForm action={signInAction} submitLabel="Đăng nhập →" hidden={next?{next}:undefined} fields={[{name:"email",label:business?"Email doanh nghiệp":"Email",type:"email",autoComplete:"email"},{name:"password",label:"Mật khẩu",type:"password",autoComplete:"current-password"}]}/><p className="mt-4 text-right text-sm"><Link className="ob-link" href="/reset-password">Quên mật khẩu?</Link></p><p className="ob-signin-link">Chưa có tài khoản? <Link className="ob-link" href={`/signup?type=${business?"business":"candidate"}`}>Đăng ký ngay</Link></p></main>;
}
