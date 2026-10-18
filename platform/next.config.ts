import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  turbopack: { root: path.join(__dirname, "..") },
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ["unpdf", "mammoth", "@react-pdf/renderer", "pdfjs-dist", "@napi-rs/canvas"],
  outputFileTracingIncludes: { "/roadmap/cv": ["../node_modules/pdfjs-dist/standard_fonts/**", "../node_modules/pdfjs-dist/cmaps/**", "../node_modules/pdfjs-dist/wasm/**", "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"], "/api/report/pdf": ["./public/fonts/NotoSans-*.ttf"], "/simulations/*": ["./public/materials/source-20261017/*.png"] },
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
