import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: { removeConsole: true },
  output: "standalone",
  logging: false,
  devIndicators: false,
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
