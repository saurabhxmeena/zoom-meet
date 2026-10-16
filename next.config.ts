import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Standard production config for Vercel */
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
