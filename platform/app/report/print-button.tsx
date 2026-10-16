"use client";

export function PrintReportButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover">Tải báo cáo PDF</button>;
}
