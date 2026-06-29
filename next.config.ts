import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Bumped to 5MB so document uploads (Graph
      // small-file endpoint caps at 4MB) fit alongside multipart overhead.
      bodySizeLimit: "5mb",
    },
    // Rewrite barrel imports of these libs to deep per-symbol imports so only
    // the used pieces ship. lucide-react is already covered by Next's defaults.
    optimizePackageImports: ["recharts", "date-fns", "@base-ui/react"],
  },
};

export default nextConfig;
