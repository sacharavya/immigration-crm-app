// PdfEngine implementation. Runs inside the worker in production; also
// constructible in Node tests because the PDFium renderer is injected (the
// default renderer only touches WASM via a dynamic import on first render).

import * as Comlink from "comlink";
import type { PDFDocument } from "pdf-lib";
import type {
  BuildOptions,
  BuildReport,
  ComparisonPair,
  CompressionPreflight,
  CompressionResult,
  DocumentId,
  DocumentInput,
  LoadedDocument,
  PageId,
  PageModel,
  PdfEngine,
  ProgressCallback,
  Rotation,
  Thumbnail,
} from "./types";
import { loadSource } from "./ops/load";
import { mergePages, type MergeInput } from "./ops/merge";
import { reorderModel } from "./ops/reorder";
import { rotateInModel } from "./ops/rotate";
import { deleteFromModel } from "./ops/delete-pages";
import { stampPageNumbers } from "./ops/page-numbers";
import { applyMetadata } from "./ops/metadata";
import {
  analyzePage,
  compressToTarget,
  SPLIT_SUGGESTION,
  type PageRasterizer,
} from "./ops/compress";
import type { RenderedPage } from "./pdfium/render";

export interface EngineRenderer {
  renderPng(
    pdfBytes: Uint8Array,
    pageIndex: number,
    maxEdgePx: number,
    /** Extra rotation applied on top of the page's own /Rotate (default 0). */
    rotation?: Rotation,
  ): Promise<RenderedPage>;
  renderJpeg(
    pdfBytes: Uint8Array,
    pageIndex: number,
    dpi: number,
    /** JPEG quality on the 0-100 scale. */
    quality: number,
  ): Promise<RenderedPage>;
}

// Dynamic import keeps WASM/OffscreenCanvas out of Node test runs. The
// engine never produces grayscale output in this version, so renderPageJpeg
// always gets grayscale false.
const lazyPdfiumRenderer: EngineRenderer = {
  renderPng: async (pdfBytes, pageIndex, maxEdgePx, rotation) =>
    (await import("./pdfium/render")).renderPagePng(
      pdfBytes,
      pageIndex,
      maxEdgePx,
      rotation,
    ),
  renderJpeg: async (pdfBytes, pageIndex, dpi, quality) =>
    (await import("./pdfium/render")).renderPageJpeg(
      pdfBytes,
      pageIndex,
      dpi,
      quality,
      false,
    ),
};

interface SessionDoc {
  name: string;
  kind: "pdf" | "image";
  bytes: Uint8Array;
  doc: PDFDocument;
  pageCount: number;
}

// Snapshot of a page at build time, so renderComparison survives later model
// mutations and document evictions.
interface HeldPage {
  builtIndex: number;
  sourceBytes: Uint8Array;
  sourcePageIndex: number;
  /** User rotation baked into the built page; the source bytes lack it. */
  rotation: Rotation;
  appliedDpi: number | null;
  appliedQuality: number | null;
}

interface HeldBuild {
  bytes: Uint8Array;
  pages: Map<PageId, HeldPage>;
}

export class PdfEngineImpl implements PdfEngine {
  private readonly renderer: EngineRenderer;
  private readonly docs = new Map<DocumentId, SessionDoc>();
  private model: PageModel = { pages: [], totalSourceBytes: 0 };
  private warnings: string[] = [];
  private held: HeldBuild | null = null;

  constructor(renderer: EngineRenderer = lazyPdfiumRenderer) {
    this.renderer = renderer;
  }

  async loadDocuments(
    inputs: DocumentInput[],
    onProgress?: ProgressCallback,
  ): Promise<{ documents: LoadedDocument[]; model: PageModel }> {
    const taskId = crypto.randomUUID();
    const documents: LoadedDocument[] = [];
    const failures: string[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const bytes = new Uint8Array(input.bytes);
      try {
        const loaded = await loadSource({ bytes, mime: input.mime });
        const id = crypto.randomUUID() as DocumentId;
        // Store loaded.bytes, not the raw input: for images that is the
        // wrapped single-page PDF, the only form PDFium can render. Size
        // accounting uses the same bytes since they are what the worker holds.
        this.docs.set(id, {
          name: input.name,
          kind: loaded.kind,
          bytes: loaded.bytes,
          doc: loaded.doc,
          pageCount: loaded.pageCount,
        });
        for (let p = 0; p < loaded.pageCount; p++) {
          this.model.pages.push({
            id: crypto.randomUUID() as PageId,
            documentId: id,
            sourcePageIndex: p,
            rotation: 0,
          });
        }
        this.model.totalSourceBytes += loaded.bytes.length;
        documents.push({
          id,
          name: input.name,
          kind: loaded.kind,
          pageCount: loaded.pageCount,
          sizeBytes: loaded.bytes.length,
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        failures.push(`Could not load "${input.name}": ${detail}`);
      }
      onProgress?.({
        taskId,
        phase: "loading",
        completed: i + 1,
        total: inputs.length,
        note: input.name,
      });
    }

    if (documents.length === 0 && inputs.length > 0) {
      throw new Error(failures.join("; "));
    }
    this.warnings.push(...failures);
    return { documents, model: structuredClone(this.model) };
  }

  async getModel(): Promise<PageModel> {
    // Deep copy: callers must never hold a reference into worker state.
    return structuredClone(this.model);
  }

  async renderThumbnail(pageId: PageId, maxEdgePx: number): Promise<Thumbnail> {
    const { ref, doc } = this.resolvePage(pageId);
    // Apply the model's user rotation so the grid always matches what build()
    // will produce; without it the Rotate button appears to do nothing.
    const rendered = await this.renderer.renderPng(
      doc.bytes,
      ref.sourcePageIndex,
      maxEdgePx,
      ref.rotation,
    );
    return {
      pageId,
      width: rendered.width,
      height: rendered.height,
      png: rendered.data,
    };
  }

  async renderPreview(pageId: PageId, maxEdgePx: number): Promise<Thumbnail> {
    // Same pipeline as thumbnails; callers just ask for a larger edge.
    return this.renderThumbnail(pageId, maxEdgePx);
  }

  async reorder(orderedPageIds: readonly PageId[]): Promise<PageModel> {
    this.model = reorderModel(this.model, orderedPageIds);
    return structuredClone(this.model);
  }

  async rotate(pageId: PageId, rotation: Rotation): Promise<PageModel> {
    this.model = rotateInModel(this.model, pageId, rotation);
    return structuredClone(this.model);
  }

  async deletePages(pageIds: readonly PageId[]): Promise<PageModel> {
    this.model = deleteFromModel(this.model, pageIds);
    // Evict documents with no surviving pages so their bytes can be GC'd.
    const alive = new Set(this.model.pages.map((p) => p.documentId));
    for (const id of this.docs.keys()) {
      if (!alive.has(id)) this.docs.delete(id);
    }
    // Freed buffers must leave the accounting too, or the 300 MB UI warning
    // keeps firing for memory that no longer exists.
    this.model.totalSourceBytes = [...this.docs.values()].reduce(
      (n, d) => n + d.bytes.length,
      0,
    );
    return structuredClone(this.model);
  }

  async preflightCompression(
    options: BuildOptions,
  ): Promise<CompressionPreflight> {
    // Analysis runs on the source documents in model order; no merge needed.
    const wouldCompress = (options.compression?.targetBytes ?? null) !== null;
    let pagesToRecompress = 0;
    const pagesWithSelectableText: PageId[] = [];
    const pagesWithFormFields: PageId[] = [];
    let estimatedOutputBytes = 0;
    const countedDocs = new Set<DocumentId>();

    for (const ref of this.model.pages) {
      const { doc } = this.resolvePage(ref.id);
      const analysis = await analyzePage(doc.doc, ref.sourcePageIndex);
      if (analysis.hasSelectableText) pagesWithSelectableText.push(ref.id);
      if (analysis.hasFormFields) pagesWithFormFields.push(ref.id);
      if (wouldCompress && analysis.classification === "image-dominant") {
        pagesToRecompress++;
      }
      if (!countedDocs.has(ref.documentId)) {
        countedDocs.add(ref.documentId);
        // Coarse estimate: sum of source document sizes. Ignores dropped
        // pages, merge overhead, and any recompression savings.
        estimatedOutputBytes += doc.bytes.length;
      }
    }

    return {
      pagesToRecompress,
      pagesToPassThrough: this.model.pages.length - pagesToRecompress,
      pagesWithSelectableText,
      pagesWithFormFields,
      warnings: [],
      estimatedOutputBytes,
    };
  }

  async build(
    options: BuildOptions,
    onProgress?: ProgressCallback,
  ): Promise<BuildReport> {
    const taskId = crypto.randomUUID();
    const items: MergeInput[] = this.model.pages.map((ref) => ({
      doc: this.resolvePage(ref.id).doc.doc,
      pageIndex: ref.sourcePageIndex,
      rotation: ref.rotation,
    }));

    let doc = await mergePages(items, (completed, total) =>
      onProgress?.({ taskId, phase: "merging", completed, total }),
    );

    let compression: CompressionResult | null = null;
    if (options.compression) {
      const rasterizer: PageRasterizer = {
        rasterize: async ({ pdfBytes, pageIndex, dpi, quality }) => {
          const r = await this.renderer.renderJpeg(
            pdfBytes,
            pageIndex,
            dpi,
            quality,
          );
          return { jpeg: r.data, widthPx: r.width, heightPx: r.height };
        },
      };
      const out = await compressToTarget({
        doc,
        pageIds: this.model.pages.map((p) => p.id),
        request: options.compression,
        rasterizer,
        onProgress: (completed, total, note) =>
          onProgress?.({ taskId, phase: "compressing", completed, total, note }),
      });
      doc = out.doc;
      compression = out.result;
    }

    // Numbering runs AFTER compression: stamping embeds a font into every
    // page's Resources, which analyzePage reads as selectable text and would
    // skip every page. Numbers drawn on recompressed pages stay vector.
    if (options.pageNumbers) {
      onProgress?.({ taskId, phase: "numbering", completed: 0, total: 1 });
      await stampPageNumbers(doc, options.pageNumbers);
      onProgress?.({ taskId, phase: "numbering", completed: 1, total: 1 });
    }

    // Metadata last: compression rebuilds a fresh document, which would drop
    // anything applied earlier.
    if (options.metadata) applyMetadata(doc, options.metadata);

    onProgress?.({ taskId, phase: "finalizing", completed: 0, total: 1 });
    const bytes = await doc.save({ useObjectStreams: true });
    onProgress?.({ taskId, phase: "finalizing", completed: 1, total: 1 });

    // The compression stage measured its own plain save; THESE bytes (object
    // streams, page numbers, metadata) are what staff upload. Re-anchor the
    // verdict so reachedTarget matches the real file.
    const target = options.compression?.targetBytes ?? null;
    if (compression && target !== null) {
      const reached = bytes.length <= target;
      compression = {
        ...compression,
        reachedTarget: reached,
        outputBytes: bytes.length,
        achievableMinimumBytes: bytes.length,
        suggestSplit: !reached,
        warnings: reached
          ? compression.warnings.filter((w) => !/not reached|splitting/i.test(w))
          : compression.warnings.includes(SPLIT_SUGGESTION)
            ? compression.warnings
            : [
                ...compression.warnings,
                "Target size not reached: finishing steps (page numbers, metadata) pushed the file over the target.",
                SPLIT_SUGGESTION,
              ],
      };
    }

    // Hold the finished bytes for the verification gate. Snapshot per-page
    // source info so renderComparison is immune to later model mutations.
    const appliedByPage = new Map(
      (compression?.perPage ?? []).map((p) => [
        p.pageId,
        { dpi: p.appliedDpi ?? null, quality: p.appliedQuality ?? null },
      ]),
    );
    const pages = new Map<PageId, HeldPage>();
    this.model.pages.forEach((ref, i) => {
      const { doc: source } = this.resolvePage(ref.id);
      const applied = appliedByPage.get(ref.id);
      pages.set(ref.id, {
        builtIndex: i,
        sourceBytes: source.bytes,
        sourcePageIndex: ref.sourcePageIndex,
        rotation: ref.rotation,
        appliedDpi: applied?.dpi ?? null,
        appliedQuality: applied?.quality ?? null,
      });
    });
    this.held = { bytes, pages };

    // Most-aggressive first: lowest quality, then lowest DPI, then largest
    // byte reduction. Recompressed pages always carry applied settings; the
    // ?? fallbacks only satisfy the optional types.
    const worstPages: PageId[] = compression
      ? compression.perPage
          .filter((p) => p.action === "recompressed")
          .sort(
            (a, b) =>
              (a.appliedQuality ?? Number.MAX_SAFE_INTEGER) -
                (b.appliedQuality ?? Number.MAX_SAFE_INTEGER) ||
              (a.appliedDpi ?? Number.MAX_SAFE_INTEGER) -
                (b.appliedDpi ?? Number.MAX_SAFE_INTEGER) ||
              b.originalBytes - b.finalBytes - (a.originalBytes - a.finalBytes),
          )
          .map((p) => p.pageId)
      : [];

    return {
      outputSize: bytes.length,
      compression,
      warnings: [...this.warnings, ...(compression?.warnings ?? [])],
      worstPages,
    };
  }

  async renderComparison(
    pageId: PageId,
    maxEdgePx: number,
  ): Promise<ComparisonPair> {
    const held = this.held;
    if (!held) {
      throw new Error(
        "No built output is held. Call build() before renderComparison().",
      );
    }
    const page = held.pages.get(pageId);
    if (!page) {
      throw new Error(`Page "${pageId}" is not part of the held build`);
    }
    // Same maxEdgePx on pages of identical dimensions = same pixel scale.
    // The original render applies the user rotation the build baked in, so
    // both thumbnails come back in the same orientation.
    const [original, compressed] = await Promise.all([
      this.renderer.renderPng(
        page.sourceBytes,
        page.sourcePageIndex,
        maxEdgePx,
        page.rotation,
      ),
      this.renderer.renderPng(held.bytes, page.builtIndex, maxEdgePx),
    ]);
    return {
      pageId,
      original: {
        pageId,
        width: original.width,
        height: original.height,
        png: original.data,
      },
      compressed: {
        pageId,
        width: compressed.width,
        height: compressed.height,
        png: compressed.data,
      },
      appliedDpi: page.appliedDpi,
      appliedQuality: page.appliedQuality,
    };
  }

  async takeOutput(): Promise<{ bytes: Uint8Array; sizeBytes: number }> {
    if (!this.held) {
      throw new Error(
        "No built output to take. Call build() first; the output can only be taken once.",
      );
    }
    const bytes = this.held.bytes;
    this.held = null;
    // Zero-copy handoff of the final PDF; the worker never reuses these bytes.
    // Outside Comlink (Node tests) this is just a WeakMap record, a no-op.
    return Comlink.transfer(
      { bytes, sizeBytes: bytes.length },
      [bytes.buffer as ArrayBuffer],
    );
  }

  async discardOutput(): Promise<void> {
    this.held = null;
  }

  async reset(): Promise<void> {
    this.docs.clear();
    this.model = { pages: [], totalSourceBytes: 0 };
    this.warnings = [];
    this.held = null;
  }

  private resolvePage(pageId: PageId): {
    ref: PageModel["pages"][number];
    doc: SessionDoc;
  } {
    const ref = this.model.pages.find((p) => p.id === pageId);
    if (!ref) throw new Error(`Unknown page id "${pageId}"`);
    const doc = this.docs.get(ref.documentId);
    if (!doc) {
      throw new Error(`Internal: missing document for page "${pageId}"`);
    }
    return { ref, doc };
  }
}
