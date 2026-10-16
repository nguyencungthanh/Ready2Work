import type { Metadata } from "next";
import "./globals.css";
import "@/components/reference/fonts.css";

export const metadata: Metadata = {
  title: { default: "Ready2Work – Sẵn sàng cho nghề nghiệp tương lai", template: "%s | Ready2Work" },
  description: "Trải nghiệm công việc thực tế, nhận phản hồi AI và xây dựng lộ trình nghề nghiệp dành riêng cho bạn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-scroll-behavior="smooth" lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
