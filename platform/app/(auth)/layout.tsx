import type { ReactNode } from "react";
import Link from "next/link";
import { landingMarkup } from "@/components/reference/static-markup";
import "@/components/reference/reference-landing.css";
import "@/components/reference/reference-auth.css";
import "@/components/reference/restoration.css";
export default function AuthLayout({ children }: { children:ReactNode }) {
 return <div className="reference-auth"><div className="auth-landing-backdrop reference-landing" aria-hidden="true" inert dangerouslySetInnerHTML={{__html:landingMarkup}}/><div className="ob-overlay auth-route-overlay"><Link href="/" className="ob-close" aria-label="Đóng">×</Link><div className="ob-screen active auth-route-screen"><div className="ob-card auth-route-card">{children}</div></div></div></div>;
}
