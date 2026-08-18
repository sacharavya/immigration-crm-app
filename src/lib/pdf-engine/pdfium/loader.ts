// Browser/worker only: fetches and instantiates the PDFium WASM module.
// Never import this from Node or server code.

import {
  init,
  type PdfiumModule,
  type WrappedPdfiumModule,
} from "@embedpdf/pdfium";

// Self-hosted: scripts/copy-pdfium-wasm.mjs (postinstall) copies the binary
// from the installed package into public/pdfium/, so the worker fetches from
// our own origin - no third-party CDN at runtime, version-locked to the dep.
const PDFIUM_WASM_URL = "/pdfium/pdfium.wasm";

let modulePromise: Promise<WrappedPdfiumModule> | null = null;

async function initialize(): Promise<WrappedPdfiumModule> {
  const response = await fetch(PDFIUM_WASM_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch pdfium.wasm (HTTP ${response.status})`);
  }
  const wasmBinary = await response.arrayBuffer();
  const mod = await init({ wasmBinary } as Partial<PdfiumModule>);
  // Required once before any PDF operation.
  mod.PDFiumExt_Init();
  return mod;
}

/** Lazy singleton, cached for the worker lifetime. */
export async function getPdfium(): Promise<WrappedPdfiumModule> {
  // Never cache a rejection: a transient wasm fetch failure must not brick
  // rendering for the worker's lifetime. Clear the cache so callers retry.
  modulePromise ??= initialize().catch((err: unknown) => {
    modulePromise = null;
    throw err;
  });
  return modulePromise;
}
