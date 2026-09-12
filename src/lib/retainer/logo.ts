import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

// Read public/genzdatalabs-logo.png once at module load and encode it as a data URL so
// the same retainer markup renders identically in:
//
//   - server-rendered preview (case detail page)
//   - public signing page
//   - Puppeteer PDF generation (which uses page.setContent and has no
//     base URL to resolve a /genzdatalabs-logo.png reference)
//
// Embedding the bytes is cheaper than threading a baseURL through
// Puppeteer and avoids the network fetch path entirely.

let cached: string | null = null;

export function getLetterheadLogoDataUrl(): string {
  if (cached) return cached;
  const path = join(process.cwd(), "public", "genzdatalabs-logo.png");
  const bytes = readFileSync(path);
  cached = `data:image/png;base64,${bytes.toString("base64")}`;
  return cached;
}
