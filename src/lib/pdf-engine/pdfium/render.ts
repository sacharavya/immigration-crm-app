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
import type { Rotation } from "../types";

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
  rotation: Rotation = 0,
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

    // GetPageWidthF/HeightF already account for the page's own /Rotate; for
    // an EXTRA 90/270 the output bitmap has swapped dims, so feed the scale
    // math the displayed orientation.
    const pageW = mod.FPDF_GetPageWidthF(page);
    const pageH = mod.FPDF_GetPageHeightF(page);
    const swap = rotation === 90 || rotation === 270;
    const { width, height } = swap ? sizeFor(pageH, pageW) : sizeFor(pageW, pageH);
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
      rotation / 90, // fpdfview.h rotate: 0, 1, 2, 3 = 0/90/180/270 clockwise
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
  /** Extra rotation applied on top of the page's own /Rotate (default 0). */
  rotation: Rotation = 0,
): Promise<RenderedPage> {
  const { width, height, rgba } = await renderRgba(
    pdfBytes,
    pageIndex,
    (w, h) => scaleForMaxEdge(w, h, maxEdgePx),
    rotation,
  );
  return { width, height, data: await encode(width, height, rgba, "image/png") };
}

// `grayscale` is unused by the current pipeline (the engine always passes
// false) but kept for future use.
export async function renderPageJpeg(
  pdfBytes: Uint8Array,
  pageIndex: number,
  dpi: number,
  /** JPEG quality on the 0-100 scale used by the compression pipeline. */
  quality: number,
  grayscale: boolean,
): Promise<RenderedPage> {
  const { width, height, rgba } = await renderRgba(pdfBytes, pageIndex, (w, h) =>
    scaleForDpi(w, h, dpi),
  );
  if (grayscale) toGrayscaleRgba(rgba);
  return {
    width,
    height,
    data: await encode(width, height, rgba, "image/jpeg", quality / 100),
  };
}
