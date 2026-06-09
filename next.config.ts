import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium ships a binary at node_modules/@sparticuz/chromium/bin
  // and resolves it at runtime via __dirname-relative paths. If Next.js
  // bundles the package into the serverless function output, the binary
  // is relocated and the runtime throws:
  //   "The input directory '/var/task/node_modules/@sparticuz/chromium/bin'
  //    does not exist"
  // Externalizing leaves the dynamic import as a real require() at runtime,
  // so the package + its binary stay at their original npm path on the
  // lambda. puppeteer-core is paired with chromium and shares the same
  // constraint, so it's also externalized to avoid version skew between the
  // protocol used by the bundled puppeteer and the real chromium binary.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  experimental: {
    serverActions: {
      // Default is 1MB. Bumped to 5MB so document uploads (Graph
      // small-file endpoint caps at 4MB) fit alongside multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
