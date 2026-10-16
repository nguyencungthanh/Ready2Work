import type { ReactNode } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { Brand } from "@/components/brand";

const links = [
  { key: "dashboard", href: "/dashboard", label: "Tổng quan" },
  { key: "roadmap", href: "/roadmap/cv", label: "Lộ trình AI" },
  { key: "simulations", href: "/simulations", label: "Mô phỏng việc làm" },
  { key: "interviews", href: "/interviews", label: "Luyện phỏng vấn" },
  { key: "report", href: "/report", label: "Báo cáo năng lực" },
] as const;

export type AppSection = typeof links[number]["key"] | "account" | "career-discovery" | "business";

export function AppShell({ children, active, displayName }: { children: ReactNode; active?: AppSection; displayName?: string }) {
  return (
    <div className="min-h-screen bg-surface">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">Đến nội dung chính</a>
      <header className="app-navigation border-b border-border bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Brand />
          <div className="flex items-center gap-4">
            <Link href="/business" aria-current={active === "business" ? "page" : undefined} className="hidden text-sm font-semibold text-muted hover:text-primary sm:block">Doanh nghiệp</Link>
            <Link href="/account" aria-current={active === "account" ? "page" : undefined} className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f9f8] text-primary" aria-hidden="true">{(displayName || "R").slice(0, 1).toUpperCase()}</span>
              <span className="hidden max-w-36 truncate md:block">{displayName || "Tài khoản"}</span>
            </Link>
            <form action={signOutAction}><button type="submit" aria-label="Sign out" className="text-xs font-semibold text-muted hover:text-primary">Đăng xuất</button></form>
          </div>
        </div>
        <nav aria-label="Không gian nghề nghiệp" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-7">
          {links.map((link) => <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${active === link.key ? "border-primary text-primary" : "border-transparent text-muted hover:border-border hover:text-foreground"}`}>{link.label}</Link>)}
        </nav>
      </header>
      <div id="workspace-content">{children}</div>
      <footer className="mx-auto max-w-7xl px-6 py-7 text-xs text-muted print:hidden">Ready2Work · Trải nghiệm thật. Chuẩn bị thật. Tự tin tiến bước.</footer>
    </div>
  );
}
