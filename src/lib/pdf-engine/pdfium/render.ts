// Browser/worker only: rasterizes PDF pages with PDFium WASM and encodes via
// OffscreenCanvas. Never import this from Node or server code (the engine
// reaches it through a dynamic import for exactly that reason).

import { getPdfium } from "./loader";
import {
  scaleForDpi,
  scaleForMaxEdge,
  toGrayscaleRgba,
  type PixelSize,
} from "./raster-math";

export interface RenderedPage {
  width: number;
  height: number;
  data: Uint8Array;
}

// fpdfview.h render flags.
const FPDF_ANNOT = 0x01;
// Makes PDFium fill the bitmap RGBA instead of BGRA - no byte swizzle needed.
const FPDF_REVERSE_BYTE_ORDER = 0x10;
const WHITE = 0xffffffff;

// HEAPU8 exists on the Emscripten module at runtime but is absent from the
// package's types (its emscripten reference is not installed); minimal shape.
interface HeapModule {
  HEAPU8: Uint8Array;
}

async function renderRgba(
  pdfBytes: Uint8Array,
  pageIndex: number,
  sizeFor: (widthPt: number, heightPt: number) => PixelSize,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray<ArrayBuffer> }> {
  const mod = await getPdfium();
  const { malloc, free } = mod.pdfium.wasmExports;
  // Re-read after every allocation: the WASM heap can grow and detach.
  const heap = (): Uint8Array => (mod.pdfium as unknown as HeapModule).HEAPU8;

  const docBuf = malloc(pdfBytes.length);
  if (!docBuf) throw new Error("PDFium: out of memory loading document");
  let doc = 0;
  let page = 0;
  let bitmap = 0;
  try {
    heap().set(pdfBytes, docBuf);
    doc = mod.FPDF_LoadMemDocument(docBuf, pdfBytes.length, "");
    if (!doc) throw new Error("PDFium could not open the document");
    page = mod.FPDF_LoadPage(doc, pageIndex);
    if (!page) throw new Error(`PDFium could not load page ${pageIndex}`);

    const { width, height } = sizeFor(
      mod.FPDF_GetPageWidthF(page),
      mod.FPDF_GetPageHeightF(page),
    );
    bitmap = mod.FPDFBitmap_Create(width, height, 1);
    if (!bitmap) throw new Error("PDFium could not allocate a page bitmap");
    mod.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, WHITE);
    mod.FPDF_RenderPageBitmap(
      bitmap,
      page,
      0,
      0,
      width,
      height,
      0,
      FPDF_ANNOT | FPDF_REVERSE_BYTE_ORDER,
    );

    const bufPtr = mod.FPDFBitmap_GetBuffer(bitmap);
    const stride = mod.FPDFBitmap_GetStride(bitmap);
    const rowBytes = width * 4;
    const rgba = new Uint8ClampedArray(rowBytes * height);
    const h = heap();
    for (let row = 0; row < height; row++) {
      const start = bufPtr + row * stride;
      rgba.set(h.subarray(start, start + rowBytes), row * rowBytes);
    }
    return { width, height, rgba };
  } finally {
    if (bitmap) mod.FPDFBitmap_Destroy(bitmap);
    if (page) mod.FPDF_ClosePage(page);
    if (doc) mod.FPDF_CloseDocument(doc);
    free(docBuf);
  }
}

async function encode(
  width: number,
  height: number,
  rgba: Uint8ClampedArray<ArrayBuffer>,
  type: "image/png" | "image/jpeg",
  quality?: number,
): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2d context unavailable");
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0);
  const blob = await canvas.convertToBlob({ type, quality });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function renderPagePng(
  pdfBytes: Uint8Array,
  pageIndex: number,
  maxEdgePx: number,
): Promise<RenderedPage> {
  const { width, height, rgba } = await renderRgba(pdfBytes, pageIndex, (w, h) =>
    scaleForMaxEdge(w, h, maxEdgePx),
  );
  return { width, height, data: await encode(width, height, rgba, "image/png") };
}

export async function renderPageJpeg(
  pdfBytes: Uint8Array,
  pageIndex: number,
  dpi: number,
  grayscale: boolean,
): Promise<RenderedPage> {
  const { width, height, rgba } = await renderRgba(pdfBytes, pageIndex, (w, h) =>
    scaleForDpi(w, h, dpi),
  );
  if (grayscale) toGrayscaleRgba(rgba);
  return {
    width,
    height,
    data: await encode(width, height, rgba, "image/jpeg", 0.8),
  };
}
