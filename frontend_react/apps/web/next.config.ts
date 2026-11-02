import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const upstream = process.env.NEWFIND_BACKEND_ORIGIN?.replace(/\/$/, "");
    return upstream
      ? [{ source: "/api/:path*", destination: `${upstream}/:path*` }]
      : [];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
