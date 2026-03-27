import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export for Cloudflare Pages
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Disable server features for static export
  trailingSlash: true,
};

export default nextConfig;
