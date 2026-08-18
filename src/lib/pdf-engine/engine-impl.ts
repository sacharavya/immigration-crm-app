// PdfEngine implementation. Runs inside the worker in production; also
// constructible in Node tests because the PDFium renderer is injected (the
// default renderer only touches WASM via a dynamic import on first render).

import * as Comlink from "comlink";
import type { PDFDocument } from "pdf-lib";
import type {
  BuildOptions,
  BuildResult,
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
  type PageRasterizer,
} from "./ops/compress";
import type { RenderedPage } from "./pdfium/render";

export interface EngineRenderer {
  renderPng(
    pdfBytes: Uint8Array,
    pageIndex: number,
    maxEdgePx: number,
  ): Promise<RenderedPage>;
  renderJpeg(
    pdfBytes: Uint8Array,
    pageIndex: number,
    dpi: number,
    grayscale: boolean,
  ): Promise<RenderedPage>;
}

// Dynamic import keeps WASM/OffscreenCanvas out of Node test runs.
const lazyPdfiumRenderer: EngineRenderer = {
  renderPng: async (pdfBytes, pageIndex, maxEdgePx) =>
    (await import("./pdfium/render")).renderPagePng(pdfBytes, pageIndex, maxEdgePx),
  renderJpeg: async (pdfBytes, pageIndex, dpi, grayscale) =>
    (await import("./pdfium/render")).renderPageJpeg(
      pdfBytes,
      pageIndex,
      dpi,
      grayscale,
    ),
};

interface SessionDoc {
  name: string;
  kind: "pdf" | "image";
  bytes: Uint8Array;
  doc: PDFDocument;
  pageCount: number;
}

export class PdfEngineImpl implements PdfEngine {
  private readonly renderer: EngineRenderer;
  private readonly docs = new Map<DocumentId, SessionDoc>();
  private model: PageModel = { pages: [], totalSourceBytes: 0 };
  private warnings: string[] = [];

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
    const rendered = await this.renderer.renderPng(
      doc.bytes,
      ref.sourcePageIndex,
      maxEdgePx,
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
  ): Promise<BuildResult> {
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
        rasterize: async ({ pdfBytes, pageIndex, dpi, grayscale }) => {
          const r = await this.renderer.renderJpeg(
            pdfBytes,
            pageIndex,
            dpi,
            grayscale,
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

    const result: BuildResult = {
      bytes,
      outputSize: bytes.length,
      compression,
      warnings: [...this.warnings, ...(compression?.warnings ?? [])],
    };
    // Zero-copy handoff of the final PDF; the worker never reuses these bytes.
    // Outside Comlink (Node tests) this is just a WeakMap record, a no-op.
    return Comlink.transfer(result, [bytes.buffer as ArrayBuffer]);
  }

  async reset(): Promise<void> {
    this.docs.clear();
    this.model = { pages: [], totalSourceBytes: 0 };
    this.warnings = [];
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
