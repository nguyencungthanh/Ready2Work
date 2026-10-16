import type { ReactNode } from "react";
const paths: Record<string, ReactNode> = {
  edit: <><path d="m16 3 5 5M4 20l4-1L21 6a2 2 0 0 0-5-3L3 16l-1 6z"/><path d="M13 21h9"/></>,
  warning: <><path d="m10 3-8 15a2 2 0 0 0 2 3h16a2 2 0 0 0 2-3L14 3a2 2 0 0 0-4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
  upload: <><path d="M17 19h1a4 4 0 0 0 0-8 7 7 0 1 0-13 5"/><path d="M12 22V10m-4 4 4-4 4 4"/></>,
  document: <><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8zM14 2v6h6M8 12h8M8 16h6"/></>,
  mic: <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v4M8 23h8"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>,
  roadmap: <><path d="M22 11v1a10 10 0 1 1-6-9"/><path d="m9 11 3 3L22 4"/></>,
  simulations: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3"/></>,
  interviews: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4m-5-9 3-3 3 3 4-5"/></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
  ai: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></>,
  accounting: <><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 4h1m6 0h1"/></>,
  finance: <><path d="m3 8 9-6 9 6H3Zm0 13h18M5 8v10m7-10v10m7-10v10"/></>,
  it: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></>,
  marketing: <><path d="m3 10 18-7v18L3 14v-4Zm4 6 2 6h4l-2-5M3 10H1v4h2"/></>,
  logistics: <><path d="M1 4h13v13H1zm13 5h5l4 5v3h-9"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/></>,
};
export function ReferenceIcon({ name, size = 24 }: { name: string; size?: number }) {
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.simulations}</svg>;
}
export function industryIcon(industry: string) {
 const s=industry.toLowerCase(); return s.includes("kế") ? "accounting" : s.includes("tài") ? "finance" : s.includes("marketing") ? "marketing" : s.includes("logistics") ? "logistics" : "it";
}
