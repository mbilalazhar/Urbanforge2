import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: { removeConsole: true },
  output: "standalone",
  logging: false,
  devIndicators: false,
  images: {
    qualities: [75, 90],
    // Hero AVIFs are prepared ahead of time. WebP keeps first-request encoding fast
    // for new product uploads while retaining responsive optimization and caching.
    formats: ["image/webp"],
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440, 1680, 1920, 2048, 2560, 3840],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/optimized/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
