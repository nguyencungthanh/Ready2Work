import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { ReferenceIcon } from "@/components/reference/icon";
import { Brand } from "@/components/brand";
import { footerMarkup } from "@/components/reference/static-markup";
import "@/components/reference/reference-app.css";
import "@/components/reference/adaptations.css";
import "@/components/reference/restoration.css";

const links = [
  { key: "dashboard", href: "/dashboard", label: "Tổng quan" },
  { key: "roadmap", href: "/roadmap/cv", label: "Lộ trình AI" },
  { key: "simulations", href: "/simulations", label: "Mô phỏng việc làm" },
  { key: "interviews", href: "/interviews", label: "Luyện phỏng vấn" },
  { key: "report", href: "/report", label: "Báo cáo năng lực" },
] as const;
export type AppSection = typeof links[number]["key"] | "account" | "career-discovery" | "business";
export function AppShell({ children, active, displayName }: { children: ReactNode; active?: AppSection; displayName?: string }) {
 return <div className="reference-app">
   <a href="#workspace-content" className="sr-only focus:not-sr-only">Đến nội dung chính</a>
   <header className="dn app-navigation">
     <Brand />
     <nav aria-label="Không gian nghề nghiệp" className="dn-links">{links.map(link=><Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} className={`dn-tab ${active === link.key ? "active" : ""}`}>{link.label}</Link>)}</nav>
     <div className="dn-right"><details className="nav-notification"><summary aria-label="Thông báo"><ReferenceIcon name="bell" size={20}/></summary><div>Chưa có thông báo mới. Kết quả và tiến độ của bạn được lưu trong các mục hoạt động.</div></details><details className="account-menu"><summary className="dn-user-wrap"><span className="dn-avatar">{(displayName || "R").slice(0,1).toUpperCase()}</span><span className="dn-uname">{displayName || "Tài khoản"}</span><span aria-hidden="true">⌄</span></summary><div className="account-dropdown"><Link href="/business">Doanh nghiệp</Link><form action={signOutAction}><button type="submit" aria-label="Sign out">Đăng xuất</button></form></div></details></div>
   </header>
   <div id="workspace-content" data-section={active}>{children}</div>
   <div className="print:hidden" dangerouslySetInnerHTML={{ __html: footerMarkup }}/>
 </div>;
}
