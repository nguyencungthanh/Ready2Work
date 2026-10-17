import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: { root: path.join(__dirname, "..") },
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["unpdf", "mammoth", "@react-pdf/renderer"],
  outputFileTracingIncludes: { "/api/report/pdf": ["./public/fonts/NotoSans-*.ttf"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};

export default nextConfig;
