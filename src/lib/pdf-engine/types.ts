// ============================================================================
// PdfEngine - typed API surface for the browser-based PDF processing module.
//
// ARCHITECTURE: all processing runs client-side inside a Web Worker. The
// worker OWNS every ArrayBuffer; the main thread holds only these lightweight
// handles and models. Input bytes cross the boundary once via Comlink.transfer
// (zero-copy) and never come back except as the final build output.
//
// This file is pure types - no imports, no runtime code - so both the worker
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
  /** Transferred to the worker with Comlink.transfer - do not reuse after. */
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
  /** Sum of loaded source sizes - drives the 300 MB warning in the UI. */
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
// Compression - content-aware and quality-first. Pages are classified per
// content; only image-dominant pages (scans) are rasterized + recompressed.
// Text/vector pages pass through untouched: rasterizing them would destroy
// selectable text, form fields, and annotations that IRCC officers rely on.
//
// Recompression is staged per page, largest byte contributor first, and stops
// the moment the target is met: DPI steps startDpi then 150 (hard floor),
// then JPEG quality by binary search from 85 down to a hard floor of 55.
// ---------------------------------------------------------------------------
export type PageContentClass =
  | "image-dominant"
  | "text-vector-dominant"
  | "mixed";

export interface CompressionRequest {
  /** null = merge only, no recompression. */
  targetBytes: number | null;
  /**
   * First DPI stage for recompressed pages (default 200). The pipeline steps
   * startDpi then 150 and never rasterizes below the hard 150 DPI floor.
   */
  startDpi?: number;
}

export interface PageCompressionOutcome {
  pageId: PageId;
  classification: PageContentClass;
  action: "recompressed" | "passed-through";
  /**
   * Approximate bytes this page contributed before compression (measured by
   * saving the page alone; overstates pages that share resources).
   */
  originalBytes: number;
  /** Bytes after the build; equals originalBytes for passed-through pages. */
  finalBytes: number;
  /** Set only when recompressed. */
  appliedDpi?: number;
  /** JPEG quality on the 0-100 scale; set only when recompressed. */
  appliedQuality?: number;
}

export interface CompressionResult {
  reachedTarget: boolean;
  outputBytes: number;
  /** What compression actually achieved - reported when the target is missed. */
  achievableMinimumBytes: number;
  pagesRecompressed: number;
  pagesPassedThrough: number;
  /** True on a miss: the package should be split into multiple submissions. */
  suggestSplit: boolean;
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

/**
 * What build() returns. The finished bytes stay HELD in the worker session
 * for the verification gate (renderComparison) and only cross the boundary
 * via takeOutput().
 */
export interface BuildReport {
  outputSize: number;
  /** Present when compression was requested. */
  compression: CompressionResult | null;
  /** Session-level warnings (e.g. an input that needed repair on load). */
  warnings: string[];
  /**
   * Recompressed pages sorted most-aggressive first: lowest quality, then
   * lowest DPI, then largest byte reduction. Empty when no compression ran.
   */
  worstPages: PageId[];
}

/** Side-by-side verification render of one page from the held build. */
export interface ComparisonPair {
  pageId: PageId;
  /** The page as loaded, before any recompression. */
  original: Thumbnail;
  /** The same page inside the built output, at the same pixel scale. */
  compressed: Thumbnail;
  /** null when the page was passed through untouched. */
  appliedDpi: number | null;
  /** null when the page was passed through untouched. */
  appliedQuality: number | null;
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
  /**
   * Delete pages from the model. Non-evicting: source documents stay held
   * until reset() so a later applyModel can restore their pages (undo).
   */
  deletePages(pageIds: readonly PageId[]): Promise<PageModel>;

  /**
   * Replace the model wholesale with any subset/order/rotations of pages
   * from documents still held in the session. Powers undo/redo and split.
   * Throws (without mutating) on unknown documents, out-of-range indexes,
   * invalid rotations, or duplicate page ids.
   */
  applyModel(pages: readonly PageRef[]): Promise<PageModel>;

  /** Classify pages + estimate output for the given options; no mutation. */
  preflightCompression(options: BuildOptions): Promise<CompressionPreflight>;

  /**
   * Merge + compress + finalize. The finished bytes are HELD in the worker
   * session for verification; fetch them with takeOutput().
   */
  build(
    options: BuildOptions,
    onProgress?: ProgressCallback,
  ): Promise<BuildReport>;

  /**
   * Render the source page and the built page at the same pixel scale for a
   * 100 percent zoom comparison. Throws if no build is held.
   */
  renderComparison(pageId: PageId, maxEdgePx: number): Promise<ComparisonPair>;

  /**
   * Transfer the held build to the caller and clear it. Throws if no build
   * is held (never built, already taken, or discarded).
   */
  takeOutput(): Promise<{ bytes: Uint8Array; sizeBytes: number }>;

  /** Clear the held build without returning it. */
  discardOutput(): Promise<void>;

  /** Free every buffer and WASM handle. The session is unusable after. */
  reset(): Promise<void>;
}
