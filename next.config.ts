import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Bumped to 5MB so document uploads (Graph
      // small-file endpoint caps at 4MB) fit alongside multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
