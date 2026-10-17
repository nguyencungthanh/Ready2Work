"use client";

import { useState } from "react";

export function DownloadReportButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/report/pdf", { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        throw new Error(response.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Chưa tải được báo cáo. Vui lòng thử lại.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ready2Work-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(error instanceof Error && error.message.startsWith("Phiên đăng nhập") ? error.message : "Chưa tải được báo cáo. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return <div><button type="button" disabled={pending} onClick={download} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60" aria-busy={pending}>{pending ? "Đang tạo PDF…" : "Tải báo cáo PDF"}</button>{error && <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">{error}</p>}</div>;
}
