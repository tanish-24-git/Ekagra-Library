import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Adding a student uploads up to three ID photos (compressed in the browser).
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
