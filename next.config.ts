import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages with serverless output
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
