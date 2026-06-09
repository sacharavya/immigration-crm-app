import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---- @sparticuz/chromium + puppeteer-core for serverless PDF rendering ----
  //
  // Two settings work together; either alone is insufficient on Vercel.
  //
  // 1. serverExternalPackages keeps the dynamic import() as a runtime
  //    require() so the package stays at its npm path (instead of being
  //    inlined into the function bundle, which would relocate __dirname).
  //
  // 2. outputFileTracingIncludes forces Next.js to ship the actual binary
  //    archives (chromium.br, al2023.tar.br, fonts.tar.br, swiftshader.tar.br)
  //    inside node_modules/@sparticuz/chromium/bin/ to the serverless
  //    function. Without this, Next.js's tracing excludes the bin folder
  //    (it sees only a dynamic import string, not a real reference to the
  //    .br files), and the lambda hits:
  //      "The input directory '/var/task/node_modules/@sparticuz/chromium/bin'
  //       does not exist"
  //
  // Routes listed are every page that runs renderRetainerPdf via a server
  // action or route handler: the case detail tab (auto-save + the manual
  // "Save to OneDrive" backup), the public signing page (online-sign auto-
  // save), and the on-demand PDF view route.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/dashboard/cases/[id]": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/sign/retainer/[token]": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
    "/api/retainer-document": [
      "./node_modules/@sparticuz/chromium/bin/**",
    ],
  },
  experimental: {
    serverActions: {
      // Default is 1MB. Bumped to 5MB so document uploads (Graph
      // small-file endpoint caps at 4MB) fit alongside multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
