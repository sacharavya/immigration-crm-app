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
    /** JPEG quality on the 0-100 scale. */
    quality: number;
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

export const DEFAULT_START_DPI = 200;
export const DPI_FLOOR = 150;
export const QUALITY_START = 85;
export const QUALITY_FLOOR = 55;

const SPLIT_SUGGESTION =
  "Consider splitting the package into multiple submissions to stay under the size limit.";

// Approximate per-page byte contribution: save the page alone in a fresh doc.
// Overstates pages that share resources (fonts, images) with siblings, but is
// consistent across pages and cheap enough for submission-sized packages.
async function pageBytesApprox(
  doc: PDFDocument,
  pageIndex: number,
): Promise<number> {
  const solo = await PDFDocument.create();
  const [page] = await solo.copyPages(doc, [pageIndex]);
  solo.addPage(page);
  return (await solo.save()).length;
}

// Rebuild the document: pages present in `jpegs` become a full-bleed JPEG at
// the original page dimensions; every other page is copied unchanged.
async function rebuildWith(
  source: PDFDocument,
  jpegs: ReadonlyMap<number, Uint8Array>,
): Promise<{ doc: PDFDocument; bytes: Uint8Array }> {
  const total = source.getPageCount();
  const rebuilt = await PDFDocument.create();
  const untouched: number[] = [];
  for (let i = 0; i < total; i++) {
    if (!jpegs.has(i)) untouched.push(i);
  }
  const copied = await rebuilt.copyPages(source, untouched);
  let c = 0;
  for (let i = 0; i < total; i++) {
    const jpeg = jpegs.get(i);
    if (jpeg) {
      const image = await rebuilt.embedJpg(jpeg);
      const { width, height } = source.getPage(i).getSize();
      rebuilt
        .addPage([width, height])
        .drawImage(image, { x: 0, y: 0, width, height });
    } else {
      rebuilt.addPage(copied[c]);
      c += 1;
    }
  }
  return { doc: rebuilt, bytes: await rebuilt.save() };
}

// Quality-first, staged, per-page byte budget:
// - Only image-dominant pages are candidates; each always renders from the
//   ORIGINAL bytes (no generational loss).
// - Greedy: repeatedly step down the candidate currently contributing the
//   most bytes, re-measure the real output, stop the moment total <= target.
// - Per page: DPI stages (startDpi then the 150 floor) at quality 85, then a
//   binary search over JPEG quality from 85 down to the hard floor of 55.
//   Floors are never crossed; a page at both floors is exhausted.
export async function compressToTarget(args: {
  doc: PDFDocument;
  pageIds: readonly PageId[];
  request: CompressionRequest;
  rasterizer: PageRasterizer;
  onProgress?: (completed: number, total: number, note?: string) => void;
}): Promise<{ doc: PDFDocument; result: CompressionResult }> {
  const { doc, pageIds, request, rasterizer, onProgress } = args;
  const target = request.targetBytes;
  const startDpi = Math.max(request.startDpi ?? DEFAULT_START_DPI, DPI_FLOOR);
  const dpiStages = startDpi > DPI_FLOOR ? [startDpi, DPI_FLOOR] : [DPI_FLOOR];
  const total = doc.getPageCount();

  const sourceBytes = await doc.save();
  const originalSize = sourceBytes.length;

  const analyses: PageAnalysis[] = [];
  for (let i = 0; i < total; i++) {
    analyses.push(await analyzePage(doc, i));
    onProgress?.(i + 1, total, "Analyzing page content");
  }

  // ponytail: O(pages) extra saves up front; fine for submission-sized docs
  const originalPageBytes: number[] = [];
  for (let i = 0; i < total; i++) {
    originalPageBytes.push(await pageBytesApprox(doc, i));
  }

  const passedThrough = (warnings: string[], size: number): CompressionResult => {
    const reached = target === null || size <= target;
    return {
      reachedTarget: reached,
      outputBytes: size,
      achievableMinimumBytes: size,
      pagesRecompressed: 0,
      pagesPassedThrough: total,
      suggestSplit: !reached,
      perPage: analyses.map((a, i) => ({
        pageId: pageIds[i],
        classification: a.classification,
        action: "passed-through" as const,
        originalBytes: originalPageBytes[i],
        finalBytes: originalPageBytes[i],
      })),
      warnings,
    };
  };

  // Merge only, or already small enough: nothing to do.
  if (target === null || originalSize <= target) {
    return { doc, result: passedThrough([], originalSize) };
  }

  interface Candidate {
    index: number;
    /** Next DPI stage to apply; past the end means the quality search. */
    stage: number;
    currentBytes: number;
    appliedDpi: number | null;
    appliedQuality: number | null;
    exhausted: boolean;
  }

  const candidates: Candidate[] = [];
  analyses.forEach((a, i) => {
    if (a.classification === "image-dominant") {
      candidates.push({
        index: i,
        stage: 0,
        currentBytes: originalPageBytes[i],
        appliedDpi: null,
        appliedQuality: null,
        exhausted: false,
      });
    }
  });

  if (candidates.length === 0) {
    return {
      doc,
      result: passedThrough(
        [
          "Target size not reached: this document is text-dominant and cannot be reduced further client-side without destroying selectable text or form fields.",
          SPLIT_SUGGESTION,
        ],
        originalSize,
      ),
    };
  }

  // Progress upper bound: DPI stages plus at most 5 quality probes per page
  // (binary search over 30 values). The bar may finish early, never overflow.
  const maxSteps = candidates.length * (dpiStages.length + 5);
  let stepsDone = 0;

  const jpegs = new Map<number, Uint8Array>();
  let currentDoc = doc;
  let currentSize = originalSize;

  const render = async (
    pageIndex: number,
    dpi: number,
    quality: number,
  ): Promise<Uint8Array> => {
    const { jpeg } = await rasterizer.rasterize({
      pdfBytes: sourceBytes,
      pageIndex,
      dpi,
      quality,
    });
    stepsDone += 1;
    onProgress?.(
      Math.min(stepsDone, maxSteps),
      maxSteps,
      `Recompressing page ${pageIndex + 1} at ${dpi} DPI, quality ${quality}`,
    );
    return jpeg;
  };

  // Re-measure by rebuilding the real output; estimates would risk reporting
  // reachedTarget wrongly. ponytail: O(steps * pages) page copies, acceptable
  // for the page counts this tool sees.
  const measure = async (): Promise<void> => {
    const out = await rebuildWith(doc, jpegs);
    currentDoc = out.doc;
    currentSize = out.bytes.length;
  };

  while (currentSize > target) {
    let next: Candidate | null = null;
    for (const c of candidates) {
      if (!c.exhausted && (next === null || c.currentBytes > next.currentBytes)) {
        next = c;
      }
    }
    if (next === null) break; // every candidate is at both floors

    if (next.stage < dpiStages.length) {
      const dpi = dpiStages[next.stage];
      next.stage += 1;
      const jpeg = await render(next.index, dpi, QUALITY_START);
      jpegs.set(next.index, jpeg);
      next.currentBytes = jpeg.length;
      next.appliedDpi = dpi;
      next.appliedQuality = QUALITY_START;
      await measure();
    } else {
      // Binary search for the highest quality that meets the target. 85 was
      // already measured by the DPI floor stage, so the search starts at 84.
      let lo = QUALITY_FLOOR;
      let hi = QUALITY_START - 1;
      let best: {
        quality: number;
        jpeg: Uint8Array;
        doc: PDFDocument;
        size: number;
      } | null = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const jpeg = await render(next.index, DPI_FLOOR, mid);
        jpegs.set(next.index, jpeg);
        await measure();
        if (currentSize <= target) {
          best = { quality: mid, jpeg, doc: currentDoc, size: currentSize };
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      if (best !== null) {
        // Restore the highest-quality probe that met the target.
        jpegs.set(next.index, best.jpeg);
        currentDoc = best.doc;
        currentSize = best.size;
        next.appliedQuality = best.quality;
        next.currentBytes = best.jpeg.length;
      } else {
        // Every probe failed; the search always ends on the quality floor,
        // so the floor jpeg is what the maps and measures already hold.
        next.appliedQuality = QUALITY_FLOOR;
        const atFloor = jpegs.get(next.index);
        if (atFloor) next.currentBytes = atFloor.length;
      }
      next.exhausted = true;
    }
  }

  const reachedTarget = currentSize <= target;
  const stepped = new Set(jpegs.keys());
  const warnings: string[] = [];
  if (!reachedTarget) {
    warnings.push(
      `Target size not reached: recompression stopped at the ${DPI_FLOOR} DPI and quality ${QUALITY_FLOOR} legibility floors.`,
      SPLIT_SUGGESTION,
    );
  }

  const byIndex = new Map(candidates.map((c) => [c.index, c]));
  const perPage: PageCompressionOutcome[] = analyses.map((a, i) => {
    const c = byIndex.get(i);
    if (c && stepped.has(i)) {
      return {
        pageId: pageIds[i],
        classification: a.classification,
        action: "recompressed" as const,
        originalBytes: originalPageBytes[i],
        finalBytes: c.currentBytes,
        appliedDpi: c.appliedDpi ?? DPI_FLOOR,
        appliedQuality: c.appliedQuality ?? QUALITY_START,
      };
    }
    return {
      pageId: pageIds[i],
      classification: a.classification,
      action: "passed-through" as const,
      originalBytes: originalPageBytes[i],
      finalBytes: originalPageBytes[i],
    };
  });

  return {
    doc: currentDoc,
    result: {
      reachedTarget,
      outputBytes: currentSize,
      achievableMinimumBytes: currentSize,
      pagesRecompressed: stepped.size,
      pagesPassedThrough: total - stepped.size,
      suggestSplit: !reachedTarget,
      perPage,
      warnings,
    },
  };
}
