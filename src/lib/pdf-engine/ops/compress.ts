// Content-aware compression core. Only image-dominant pages (scans) are ever
// rasterized; anything carrying selectable text or form fields passes through
// untouched so officers keep searchable text and fillable fields.

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
  PDFStream,
  decodePDFRawStream,
  type PDFPageLeaf,
} from "pdf-lib";
import type {
  CompressionRequest,
  CompressionResult,
  PageCompressionOutcome,
  PageContentClass,
  PageId,
} from "../types";

export interface PageAnalysis {
  classification: PageContentClass;
  hasSelectableText: boolean;
  hasFormFields: boolean;
}

export interface PageRasterizer {
  rasterize(args: {
    pdfBytes: Uint8Array;
    pageIndex: number;
    dpi: number;
    grayscale: boolean;
  }): Promise<{ jpeg: Uint8Array; widthPx: number; heightPx: number }>;
}

// Text-showing operators (Tj, TJ, ', "). Matching these chars inside string
// literals is a false positive in the SAFE direction: it keeps text true.
const TEXT_SHOWING_OP = /Tj|TJ|'|"/;

const latin1 = new TextDecoder("latin1");

// Decoded page content, or null when any stream cannot be decoded - callers
// must treat null as "assume text is present".
function decodeContentStreams(node: PDFPageLeaf): string | null {
  const contents = node.Contents();
  if (!contents) return "";
  const streams =
    contents instanceof PDFArray
      ? Array.from({ length: contents.size() }, (_, i) => contents.lookup(i))
      : [contents];
  let out = "";
  for (const s of streams) {
    try {
      if (s instanceof PDFRawStream) {
        out += latin1.decode(decodePDFRawStream(s).decode());
      } else if (s instanceof PDFStream) {
        out += latin1.decode(s.getContents());
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  return out;
}

// Heuristic:
// - hasFormFields: any Widget-subtype annotation in the page's Annots.
// - hasSelectableText: Font entries in Resources; refined to false only when
//   the content stream decodes cleanly AND shows no text operator. Any doubt
//   keeps TRUE - flattening text by mistake is the failure we cannot afford.
// - images: Resources XObject entries with Subtype /Image.
// - classification: images with no text-ish content -> image-dominant;
//   text-ish with no images -> text-vector-dominant; both -> mixed;
//   neither -> text-vector-dominant. Only image-dominant is ever rasterized.
export async function analyzePage(
  doc: PDFDocument,
  pageIndex: number,
): Promise<PageAnalysis> {
  const node = doc.getPage(pageIndex).node;

  let hasFormFields = false;
  const annots = node.Annots();
  if (annots instanceof PDFArray) {
    for (let i = 0; i < annots.size(); i++) {
      const a = annots.lookup(i);
      if (
        a instanceof PDFDict &&
        a.get(PDFName.of("Subtype")) === PDFName.of("Widget")
      ) {
        hasFormFields = true;
        break;
      }
    }
  }

  const resources = node.Resources();
  const fonts = resources?.lookup(PDFName.of("Font"));
  const hasFontResource = fonts instanceof PDFDict && fonts.keys().length > 0;

  let hasImages = false;
  const xobjects = resources?.lookup(PDFName.of("XObject"));
  if (xobjects instanceof PDFDict) {
    for (const key of xobjects.keys()) {
      const xo = xobjects.lookup(key);
      if (
        xo instanceof PDFStream &&
        xo.dict.get(PDFName.of("Subtype")) === PDFName.of("Image")
      ) {
        hasImages = true;
        break;
      }
    }
  }

  let hasSelectableText = hasFontResource;
  if (hasFontResource) {
    const content = decodeContentStreams(node);
    if (content !== null && !TEXT_SHOWING_OP.test(content)) {
      hasSelectableText = false;
    }
  }

  const textish = hasSelectableText || hasFormFields;
  const classification: PageContentClass =
    hasImages && !textish
      ? "image-dominant"
      : hasImages
        ? "mixed"
        : "text-vector-dominant";

  return { classification, hasSelectableText, hasFormFields };
}

const LADDER_DPI = [200, 150, 120, 96];

// Default floor of 150 DPI keeps documents legible for visa officers.
// Grayscale is the last lever, applied at the floor only when opted in.
export function compressionLadder(
  floorDpi = 150,
  allowGrayscale = false,
): ReadonlyArray<{ dpi: number; grayscale: boolean }> {
  const steps = LADDER_DPI.filter((d) => d >= floorDpi).map((dpi) => ({
    dpi,
    grayscale: false,
  }));
  if (allowGrayscale) steps.push({ dpi: floorDpi, grayscale: true });
  return steps;
}

export async function compressToTarget(args: {
  doc: PDFDocument;
  pageIds: readonly PageId[];
  request: CompressionRequest;
  rasterizer: PageRasterizer;
  onProgress?: (completed: number, total: number, note?: string) => void;
}): Promise<{ doc: PDFDocument; result: CompressionResult }> {
  const { doc, pageIds, request, rasterizer, onProgress } = args;
  const target = request.targetBytes;
  const floorDpi = request.floorDpi ?? 150;
  const total = doc.getPageCount();

  const originalBytes = await doc.save();
  const originalSize = originalBytes.length;

  const analyses: PageAnalysis[] = [];
  for (let i = 0; i < total; i++) {
    analyses.push(await analyzePage(doc, i));
    onProgress?.(i + 1, total, "Analyzing page content");
  }

  const passedThrough = (warnings: string[], size: number): CompressionResult => ({
    reachedTarget: target === null || size <= target,
    outputBytes: size,
    achievableMinimumBytes: size,
    pagesRecompressed: 0,
    pagesPassedThrough: total,
    perPage: analyses.map((a, i) => ({
      pageId: pageIds[i],
      classification: a.classification,
      action: "passed-through",
    })),
    warnings,
  });

  // Merge only, or already small enough: nothing to do.
  if (target === null || originalSize <= target) {
    return { doc, result: passedThrough([], originalSize) };
  }

  const candidateSet = new Set<number>();
  analyses.forEach((a, i) => {
    if (a.classification === "image-dominant") candidateSet.add(i);
  });

  if (candidateSet.size === 0) {
    return {
      doc,
      result: passedThrough(
        [
          "Target size not reached: this document is text-dominant and cannot be reduced further client-side without destroying selectable text or form fields.",
        ],
        originalSize,
      ),
    };
  }

  // Walk the ladder. Each step re-rasterizes the current best output (the
  // original on the first step), rebuilding a fresh doc where candidate pages
  // become a full-bleed JPEG at the original page dimensions and every other
  // page is copied from the original unchanged.
  const ladder = compressionLadder(request.floorDpi, request.allowGrayscale);
  const nonCandidates: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!candidateSet.has(i)) nonCandidates.push(i);
  }

  let best: {
    doc: PDFDocument;
    size: number;
    step: { dpi: number; grayscale: boolean };
  } | null = null;
  let inputBytes = originalBytes;

  for (const step of ladder) {
    const rebuilt = await PDFDocument.create();
    const copied = await rebuilt.copyPages(doc, nonCandidates);
    let c = 0;
    for (let i = 0; i < total; i++) {
      if (candidateSet.has(i)) {
        const { jpeg } = await rasterizer.rasterize({
          pdfBytes: inputBytes,
          pageIndex: i,
          dpi: step.dpi,
          grayscale: step.grayscale,
        });
        const image = await rebuilt.embedJpg(jpeg);
        const { width, height } = doc.getPage(i).getSize();
        rebuilt.addPage([width, height]).drawImage(image, {
          x: 0,
          y: 0,
          width,
          height,
        });
      } else {
        rebuilt.addPage(copied[c++]);
      }
    }
    const outBytes = await rebuilt.save();
    // <= prefers the later (lower DPI / grayscale) step on size ties.
    if (best === null || outBytes.length <= best.size) {
      best = { doc: rebuilt, size: outBytes.length, step };
      inputBytes = outBytes;
    }
    if (outBytes.length <= target) break;
  }

  // Empty ladder (floorDpi above every step, grayscale off) - nothing ran.
  if (best === null) {
    return {
      doc,
      result: passedThrough(
        [
          `Target size not reached: no compression step is available at or above the ${floorDpi} DPI legibility floor.`,
        ],
        originalSize,
      ),
    };
  }

  // Rebind to a const so the narrowing survives inside closures below.
  const chosen = best;
  const reachedTarget = chosen.size <= target;
  const warnings: string[] = [];
  if (!reachedTarget) {
    const blocked = analyses.filter(
      (a) => a.hasSelectableText || a.hasFormFields,
    ).length;
    warnings.push(
      `Target size not reached: ${blocked} page(s) contain selectable text or form fields and were not recompressed. The ${floorDpi} DPI legibility floor was respected.`,
    );
  }

  const perPage: PageCompressionOutcome[] = analyses.map((a, i) =>
    candidateSet.has(i)
      ? {
          pageId: pageIds[i],
          classification: a.classification,
          action: "recompressed",
          appliedDpi: chosen.step.dpi,
          grayscale: chosen.step.grayscale,
        }
      : {
          pageId: pageIds[i],
          classification: a.classification,
          action: "passed-through",
        },
  );

  return {
    doc: chosen.doc,
    result: {
      reachedTarget,
      outputBytes: chosen.size,
      achievableMinimumBytes: chosen.size,
      pagesRecompressed: candidateSet.size,
      pagesPassedThrough: total - candidateSet.size,
      perPage,
      warnings,
    },
  };
}
