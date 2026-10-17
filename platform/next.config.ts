import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: { root: path.join(__dirname, "..") },
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["unpdf", "mammoth", "@react-pdf/renderer"],
  outputFileTracingIncludes: { "/api/report/pdf": ["./public/fonts/NotoSans-*.ttf"], "/simulations/*": ["./public/materials/source-20261017/*.png"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }, { source: "/materials/:path*", headers: [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
    ] }];
  },
};

export default nextConfig;
