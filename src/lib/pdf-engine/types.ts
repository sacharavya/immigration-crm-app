// ============================================================================
// PdfEngine — typed API surface for the browser-based PDF processing module.
//
// ARCHITECTURE: all processing runs client-side inside a Web Worker. The
// worker OWNS every ArrayBuffer; the main thread holds only these lightweight
// handles and models. Input bytes cross the boundary once via Comlink.transfer
// (zero-copy) and never come back except as the final build output.
//
// This file is pure types — no imports, no runtime code — so both the worker
// implementation and the UI depend on it without pulling in each other.
// ============================================================================

// ---------------------------------------------------------------------------
// Handles. Branded so a DocumentId can't be passed where a PageId is expected
// (and neither can be fabricated from a bare string without a cast).
// ---------------------------------------------------------------------------
export type DocumentId = string & { readonly __brand: "DocumentId" };
export type PageId = string & { readonly __brand: "PageId" };

export type Rotation = 0 | 90 | 180 | 270;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
export type SupportedMime = "application/pdf" | "image/jpeg" | "image/png";

export interface DocumentInput {
  name: string;
  mime: SupportedMime;
  /** Transferred to the worker with Comlink.transfer — do not reuse after. */
  bytes: ArrayBuffer;
}

export interface LoadedDocument {
  id: DocumentId;
  name: string;
  kind: "pdf" | "image";
  pageCount: number;
  sizeBytes: number;
}

// ---------------------------------------------------------------------------
// The working model: one ordered list of page references across all loaded
// documents. This IS the editable state; reorder/rotate/delete operate on it.
// ---------------------------------------------------------------------------
export interface PageRef {
  /** Stable id for this page instance within the session. */
  id: PageId;
  documentId: DocumentId;
  /** 0-based page index within the source document. */
  sourcePageIndex: number;
  /** Net rotation applied on top of the source page's own rotation. */
  rotation: Rotation;
}

export interface PageModel {
  pages: PageRef[];
  /** Sum of loaded source sizes — drives the 300 MB warning in the UI. */
  totalSourceBytes: number;
}

// ---------------------------------------------------------------------------
// Progress. Any operation that may exceed 300ms accepts a callback (wrapped
// with Comlink.proxy on the main thread).
// ---------------------------------------------------------------------------
export type ProgressPhase =
  | "loading"
  | "rendering"
  | "merging"
  | "numbering"
  | "compressing"
  | "finalizing";

export interface ProgressEvent {
  taskId: string;
  phase: ProgressPhase;
  completed: number;
  total: number;
  note?: string;
}

export type ProgressCallback = (e: ProgressEvent) => void;

// ---------------------------------------------------------------------------
// Rendering (PDFium). Small rasters for the grid; larger for preview.
// ---------------------------------------------------------------------------
export interface Thumbnail {
  pageId: PageId;
  width: number;
  height: number;
  /** PNG bytes, transferred to the main thread. */
  png: Uint8Array;
}

// ---------------------------------------------------------------------------
// Page numbering
// ---------------------------------------------------------------------------
export type PageNumberFormat = "n" | "n-of-total" | "page-n" | "page-n-of-total";

export type Corner =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface PageNumberOptions {
  format: PageNumberFormat;
  position: Corner;
  /** Number shown on the first page (usually 1). */
  startAt: number;
  fontSize: number;
  /** Distance from the page edges, in PDF points. */
  marginPt: number;
}

// ---------------------------------------------------------------------------
// Compression — content-aware. Pages are classified per content; only
// image-dominant pages (scans) are rasterized + recompressed. Text/vector
// pages pass through untouched: rasterizing them would destroy selectable
// text, form fields, and annotations that IRCC officers rely on.
// ---------------------------------------------------------------------------
export type PageContentClass =
  | "image-dominant"
  | "text-vector-dominant"
  | "mixed";

export interface CompressionRequest {
  /** null = merge only, no recompression. */
  targetBytes: number | null;
  /**
   * Legibility floor. Never rasterize below this even if the target is
   * missed — visa officers must be able to read the result. Default 150.
   */
  floorDpi?: number;
  /** Last lever after the DPI floor; opt-in. */
  allowGrayscale?: boolean;
}

export interface PageCompressionOutcome {
  pageId: PageId;
  classification: PageContentClass;
  action: "recompressed" | "passed-through";
  appliedDpi?: number;
  grayscale?: boolean;
}

export interface CompressionResult {
  reachedTarget: boolean;
  outputBytes: number;
  /** What compression actually achieved — reported when the target is missed. */
  achievableMinimumBytes: number;
  pagesRecompressed: number;
  pagesPassedThrough: number;
  perPage: PageCompressionOutcome[];
  warnings: string[];
}

/**
 * Pre-build check the UI runs to warn staff BEFORE flattening anything:
 * which pages would be rasterized, and which of those carry selectable
 * text or form fields that flattening would destroy.
 */
export interface CompressionPreflight {
  pagesToRecompress: number;
  pagesToPassThrough: number;
  pagesWithSelectableText: PageId[];
  pagesWithFormFields: PageId[];
  warnings: string[];
  estimatedOutputBytes: number;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

export interface BuildOptions {
  pageNumbers?: PageNumberOptions;
  compression?: CompressionRequest;
  metadata?: PdfMetadata;
}

export interface BuildResult {
  /** Final PDF, transferred to the main thread. */
  bytes: Uint8Array;
  outputSize: number;
  /** Present when compression was requested. */
  compression: CompressionResult | null;
  /** Session-level warnings (e.g. an input that needed repair on load). */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// The engine. Implemented in the worker; consumed on the main thread through
// a Comlink proxy (every method becomes async regardless of signature).
// ---------------------------------------------------------------------------
export interface PdfEngine {
  /** Load PDFs/images (images become single-page PDFs). Appends to the model. */
  loadDocuments(
    inputs: DocumentInput[],
    onProgress?: ProgressCallback,
  ): Promise<{ documents: LoadedDocument[]; model: PageModel }>;

  getModel(): Promise<PageModel>;

  renderThumbnail(pageId: PageId, maxEdgePx: number): Promise<Thumbnail>;
  renderPreview(pageId: PageId, maxEdgePx: number): Promise<Thumbnail>;

  /** Must contain exactly the current page ids, in the new order. */
  reorder(orderedPageIds: readonly PageId[]): Promise<PageModel>;
  rotate(pageId: PageId, rotation: Rotation): Promise<PageModel>;
  deletePages(pageIds: readonly PageId[]): Promise<PageModel>;

  /** Classify pages + estimate output for the given options; no mutation. */
  preflightCompression(options: BuildOptions): Promise<CompressionPreflight>;

  build(
    options: BuildOptions,
    onProgress?: ProgressCallback,
  ): Promise<BuildResult>;

  /** Free every buffer and WASM handle. The session is unusable after. */
  reset(): Promise<void>;
}
