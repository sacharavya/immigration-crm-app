// Postinstall: copy the PDFium WASM binary from the installed package into
// public/ so the PDF engine worker fetches it from our own origin instead of
// a third-party CDN. Keeps the binary version-locked to @embedpdf/pdfium and
// out of git (public/pdfium/ is gitignored).
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@embedpdf/pdfium/dist/pdfium.wasm");
const destDir = join(root, "public/pdfium");
const dest = join(destDir, "pdfium.wasm");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-pdfium-wasm] ${src} -> ${dest}`);
