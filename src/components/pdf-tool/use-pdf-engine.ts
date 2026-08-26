"use client";

// Owns the PDF engine lifecycle for the submission tool: lazy worker startup,
// the working model, a small thumbnail render queue, busy/progress state, and
// typed actions. All heavy work happens in the worker; this hook only moves
// handles and object URLs.
//
// Every mutation (reorder / rotate-via-applyModel / delete / load) resolves
// with the model BEFORE and AFTER the worker confirmed it, so the editor
// store can push the previous snapshot onto its undo stack. Undo/redo call
// applyModel with a snapshot; the hook adopts the confirmed result.

import { useCallback, useEffect, useRef, useState } from "react";

import { createPdfEngineClient, type PdfEngineClient } from "@/lib/pdf-engine";
import {
  LocalDownloadSink,
  LocalFileSource,
} from "@/lib/pdf-engine/sources/local";
import type {
  BuildOptions,
  BuildReport,
  ComparisonPair,
  CompressionPreflight,
  LoadedDocument,
  PageId,
  PageModel,
  PageRef,
  ProgressEvent,
  ProgressPhase,
  Thumbnail,
} from "@/lib/pdf-engine/types";

const THUMBNAIL_EDGE_PX = 320;
const THUMBNAIL_CONCURRENCY = 2;
const PREVIEW_CONCURRENCY = 2;
/** Above this total input size the UI shows a slow/memory warning. */
export const INPUT_WARNING_BYTES = 300_000_000;
/** Operations shorter than this never show progress UI. */
const OVERLAY_DELAY_MS = 300;

const EMPTY_MODEL: PageModel = { pages: [], totalSourceBytes: 0 };

export interface BusyState {
  active: boolean;
  phase: ProgressPhase | null;
  completed: number;
  total: number;
  note?: string;
}

const IDLE: BusyState = { active: false, phase: null, completed: 0, total: 0 };

/** A cached thumbnail render: object URL plus raster dimensions. */
export interface PageThumb {
  url: string;
  width: number;
  height: number;
}

/** Worker-confirmed models around a mutation, for the undo stack. */
export interface MutationResult {
  previous: PageModel;
  next: PageModel;
}

/** A queued canvas preview render awaiting the worker. */
interface PreviewJob {
  pageId: PageId;
  maxEdgePx: number;
  signal: AbortSignal | undefined;
  resolve: (thumb: Thumbnail | null) => void;
}

/**
 * Names of submitted inputs that did not come back from the loader, counting
 * duplicates (two "scan.pdf" in, one out = one missing "scan.pdf").
 */
export function missingInputNames(
  submitted: readonly string[],
  loaded: readonly string[],
): string[] {
  const counts = new Map<string, number>();
  for (const name of loaded) counts.set(name, (counts.get(name) ?? 0) + 1);
  return submitted.filter((name) => {
    const remaining = counts.get(name) ?? 0;
    if (remaining === 0) return true;
    counts.set(name, remaining - 1);
    return false;
  });
}

export interface UsePdfEngine {
  documents: LoadedDocument[];
  model: PageModel | null;
  /** PageId -> rendered PNG thumbnail (object URL + dimensions). */
  thumbnails: ReadonlyMap<PageId, PageThumb>;
  busy: BusyState;
  /**
   * True the moment a user action starts, unlike busy.active which waits for
   * the overlay delay. Drive disabled props from this so a second click is
   * never silently dropped by the run guard.
   */
  acting: boolean;
  error: string | null;
  inputWarning: string | null;
  /** Report of the build currently held in the worker (null after discard). */
  lastBuild: BuildReport | null;
  loadFiles: (files: File[]) => Promise<MutationResult | null>;
  reorder: (
    orderedPageIds: readonly PageId[],
  ) => Promise<MutationResult | null>;
  deletePages: (pageIds: readonly PageId[]) => Promise<MutationResult | null>;
  /**
   * Replace the model wholesale (rotation changes, undo, redo). Thumbnails of
   * pages whose rotation changed are invalidated automatically.
   */
  applyModel: (pages: readonly PageRef[]) => Promise<MutationResult | null>;
  /** Quiet preview render for the canvas; null on failure, abort, or stale page. */
  renderPreview: (
    pageId: PageId,
    maxEdgePx: number,
    /** Aborting skips the render if it has not reached the worker yet. */
    signal?: AbortSignal,
  ) => Promise<Thumbnail | null>;
  preflight: (options: BuildOptions) => Promise<CompressionPreflight | null>;
  build: (options: BuildOptions) => Promise<BuildReport | null>;
  renderComparison: (
    pageId: PageId,
    maxEdgePx: number,
  ) => Promise<ComparisonPair | null>;
  takeOutput: () => Promise<{ bytes: Uint8Array; sizeBytes: number } | null>;
  discardOutput: () => Promise<void>;
  /**
   * Split export: apply the given page range, build merge-only, download as
   * fileName, then restore the full model in a finally block so a failure
   * cannot strand the session. Atomic under the action mutex.
   */
  exportRange: (
    pages: readonly PageRef[],
    fileName: string,
  ) => Promise<boolean | null>;
  resetAll: () => Promise<void>;
}

export function usePdfEngine(): UsePdfEngine {
  const [documents, setDocuments] = useState<LoadedDocument[]>([]);
  const [model, setModel] = useState<PageModel | null>(null);
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<PageId, PageThumb>>(
    new Map(),
  );
  const [busy, setBusy] = useState<BusyState>(IDLE);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBuild, setLastBuild] = useState<BuildReport | null>(null);

  const engineRef = useRef<PdfEngineClient | null>(null);
  const runningRef = useRef(false);
  const modelRef = useRef<PageModel | null>(null);
  /** True while the worker holds finished build bytes. */
  const heldOutputRef = useRef(false);
  /** Latest-wins sequence for background preflight calls. */
  const preflightSeqRef = useRef(0);

  const thumbsRef = useRef<Map<PageId, PageThumb>>(new Map());
  const previewQueueRef = useRef<PreviewJob[]>([]);
  const previewInFlightRef = useRef(0);
  const queueRef = useRef<PageId[]>([]);
  const queuedRef = useRef<Set<PageId>>(new Set());
  /** Bumped by invalidateThumbnail so an in-flight render's result is dropped. */
  const thumbGenRef = useRef<Map<PageId, number>>(new Map());
  const inFlightRef = useRef(0);

  const getEngine = useCallback((): PdfEngineClient => {
    if (!engineRef.current) engineRef.current = createPdfEngineClient();
    return engineRef.current;
  }, []);

  // -------------------------------------------------------------------------
  // Thumbnail queue: at most THUMBNAIL_CONCURRENCY renders in flight, cached
  // by PageId as object URLs. The worker serializes calls anyway; the cap
  // just keeps the queue from flooding it ahead of user actions.
  // -------------------------------------------------------------------------
  const pumpThumbnails = useCallback(() => {
    const pump = (): void => {
      while (inFlightRef.current < THUMBNAIL_CONCURRENCY) {
        const pageId = queueRef.current.shift();
        if (!pageId) return;
        if (thumbsRef.current.has(pageId)) {
          queuedRef.current.delete(pageId);
          continue;
        }
        inFlightRef.current += 1;
        const gen = thumbGenRef.current.get(pageId) ?? 0;
        getEngine()
          .renderThumbnail(pageId, THUMBNAIL_EDGE_PX)
          .then((thumb) => {
            // The page may have been deleted, or invalidated (rotated),
            // while the render was in flight.
            if (!modelRef.current?.pages.some((p) => p.id === pageId)) return;
            if ((thumbGenRef.current.get(pageId) ?? 0) !== gen) return;
            const url = URL.createObjectURL(
              new Blob([thumb.png as BlobPart], { type: "image/png" }),
            );
            const previous = thumbsRef.current.get(pageId);
            if (previous) URL.revokeObjectURL(previous.url);
            thumbsRef.current.set(pageId, {
              url,
              width: thumb.width,
              height: thumb.height,
            });
            setThumbnails(new Map(thumbsRef.current));
          })
          .catch(() => {
            // Deleted mid-render or the engine was reset; nothing to show.
          })
          .finally(() => {
            // If an invalidation re-queued this id mid-render, its marker
            // belongs to the fresh entry; leave it alone.
            if ((thumbGenRef.current.get(pageId) ?? 0) === gen) {
              queuedRef.current.delete(pageId);
            }
            inFlightRef.current -= 1;
            pump();
          });
      }
    };
    pump();
  }, [getEngine]);

  const enqueueThumbnail = useCallback((pageId: PageId) => {
    if (thumbsRef.current.has(pageId) || queuedRef.current.has(pageId)) return;
    queuedRef.current.add(pageId);
    queueRef.current.push(pageId);
  }, []);

  /** Drop the cached render for a page (rotation changed) and re-queue it. */
  const invalidateThumbnail = useCallback(
    (pageId: PageId) => {
      // Bump the generation so an in-flight render's stale raster is dropped.
      thumbGenRef.current.set(
        pageId,
        (thumbGenRef.current.get(pageId) ?? 0) + 1,
      );
      const thumb = thumbsRef.current.get(pageId);
      if (thumb) {
        URL.revokeObjectURL(thumb.url);
        thumbsRef.current.delete(pageId);
      }
      // Clear the queued marker: the id may be mid-render, and enqueue would
      // otherwise no-op, leaving the page stuck on the old rotation.
      queuedRef.current.delete(pageId);
      enqueueThumbnail(pageId);
    },
    [enqueueThumbnail],
  );

  /** Adopt a new model: prune dead cache entries, queue missing renders. */
  const adoptModel = useCallback(
    (next: PageModel) => {
      modelRef.current = next;
      setModel(next);
      const live = new Set(next.pages.map((p) => p.id));
      for (const [pageId, thumb] of thumbsRef.current) {
        if (!live.has(pageId)) {
          URL.revokeObjectURL(thumb.url);
          thumbsRef.current.delete(pageId);
        }
      }
      for (const page of next.pages) enqueueThumbnail(page.id);
      setThumbnails(new Map(thumbsRef.current));
      pumpThumbnails();
    },
    [enqueueThumbnail, pumpThumbnails],
  );

  // -------------------------------------------------------------------------
  // Action runner: re-entry guard + delayed progress state + error capture.
  // -------------------------------------------------------------------------
  const run = useCallback(
    async <T,>(
      fn: (engine: PdfEngineClient) => Promise<T>,
    ): Promise<T | null> => {
      if (runningRef.current) return null;
      runningRef.current = true;
      // Flip acting immediately so the UI disables now, not at the 300 ms
      // progress mark; otherwise a second click in that window is dropped
      // silently by the guard above.
      setActing(true);
      setError(null);
      const timer = window.setTimeout(() => {
        setBusy((b) => ({ ...b, active: true }));
      }, OVERLAY_DELAY_MS);
      try {
        return await fn(getEngine());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        return null;
      } finally {
        window.clearTimeout(timer);
        runningRef.current = false;
        setActing(false);
        setBusy(IDLE);
      }
    },
    [getEngine],
  );

  const onProgress = useCallback((e: ProgressEvent) => {
    setBusy((b) => ({
      active: b.active,
      phase: e.phase,
      completed: e.completed,
      total: e.total,
      note: e.note,
    }));
  }, []);

  /** Editing after a build invalidates the held output and its report. */
  const dropHeldBuild = useCallback(async (engine: PdfEngineClient) => {
    setLastBuild(null);
    if (!heldOutputRef.current) return;
    heldOutputRef.current = false;
    await engine.discardOutput().catch(() => {});
  }, []);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const loadFiles = useCallback(
    async (files: File[]): Promise<MutationResult | null> => {
      if (files.length === 0) return null;
      return run(async (engine) => {
        const previous = modelRef.current ?? EMPTY_MODEL;
        await dropHeldBuild(engine);
        const source = new LocalFileSource(files);
        const items = await source.list();
        const inputs = await Promise.all(items.map((i) => source.fetch(i)));
        const result = await engine.loadDocuments(inputs, onProgress);
        setDocuments((prev) => [...prev, ...result.documents]);
        adoptModel(result.model);
        // The worker only throws when EVERY input fails; a corrupt file among
        // several is silently dropped into worker-side warnings. Name the
        // files that did not come back so a submission package is never
        // silently incomplete.
        if (result.documents.length < inputs.length) {
          const missing = missingInputNames(
            inputs.map((i) => i.name),
            result.documents.map((d) => d.name),
          );
          setError(
            `Could not load: ${missing.join(", ")}. The other files were added.`,
          );
        }
        return { previous, next: result.model };
      });
    },
    [run, dropHeldBuild, onProgress, adoptModel],
  );

  const reorder = useCallback(
    (orderedPageIds: readonly PageId[]) =>
      run(async (engine): Promise<MutationResult | null> => {
        const previous = modelRef.current;
        if (!previous) return null;
        await dropHeldBuild(engine);
        const next = await engine.reorder(orderedPageIds);
        adoptModel(next);
        return { previous, next };
      }).then((r) => r ?? null),
    [run, dropHeldBuild, adoptModel],
  );

  const deletePages = useCallback(
    async (pageIds: readonly PageId[]): Promise<MutationResult | null> => {
      if (pageIds.length === 0) return null;
      const result = await run(
        async (engine): Promise<MutationResult | null> => {
          const previous = modelRef.current;
          if (!previous) return null;
          await dropHeldBuild(engine);
          const next = await engine.deletePages(pageIds);
          adoptModel(next);
          return { previous, next };
        },
      );
      return result ?? null;
    },
    [run, dropHeldBuild, adoptModel],
  );

  const applyModel = useCallback(
    (pages: readonly PageRef[]) =>
      run(async (engine): Promise<MutationResult | null> => {
        const previous = modelRef.current;
        if (!previous) return null;
        await dropHeldBuild(engine);
        const next = await engine.applyModel(pages);
        // Invalidate thumbnails whose rotation changed under them.
        const prevRotation = new Map(
          previous.pages.map((p) => [p.id, p.rotation]),
        );
        for (const page of next.pages) {
          const before = prevRotation.get(page.id);
          if (before !== undefined && before !== page.rotation) {
            invalidateThumbnail(page.id);
          }
        }
        adoptModel(next);
        return { previous, next };
      }).then((r) => r ?? null),
    [run, dropHeldBuild, invalidateThumbnail, adoptModel],
  );

  // Quiet path for the canvas: no run() mutex and no progress UI, but bounded
  // like the thumbnail queue. Unbounded, a fast scroll through a large
  // package posts one uncancellable raster per page crossed and the next
  // user action queues behind all of them in the single-threaded worker.
  // Aborted (scrolled-past) or deleted pages are skipped at pump time so
  // they never reach the worker.
  const pumpPreviews = useCallback(() => {
    const pump = (): void => {
      while (previewInFlightRef.current < PREVIEW_CONCURRENCY) {
        const job = previewQueueRef.current.shift();
        if (!job) return;
        if (
          job.signal?.aborted ||
          !modelRef.current?.pages.some((p) => p.id === job.pageId)
        ) {
          job.resolve(null);
          continue;
        }
        previewInFlightRef.current += 1;
        getEngine()
          .renderPreview(job.pageId, job.maxEdgePx)
          .then((thumb) => job.resolve(job.signal?.aborted ? null : thumb))
          .catch(() => job.resolve(null))
          .finally(() => {
            previewInFlightRef.current -= 1;
            pump();
          });
      }
    };
    pump();
  }, [getEngine]);

  const renderPreview = useCallback(
    (
      pageId: PageId,
      maxEdgePx: number,
      signal?: AbortSignal,
    ): Promise<Thumbnail | null> =>
      new Promise((resolve) => {
        previewQueueRef.current.push({ pageId, maxEdgePx, signal, resolve });
        pumpPreviews();
      }),
    [pumpPreviews],
  );

  // Background/advisory, so it bypasses run(): it must never block user
  // actions, pop progress UI, or be dropped by the mutex (the worker
  // serializes calls anyway). Latest-wins: a superseded result returns null.
  const preflight = useCallback(
    async (options: BuildOptions): Promise<CompressionPreflight | null> => {
      const seq = ++preflightSeqRef.current;
      try {
        const result = await getEngine().preflightCompression(options);
        return seq === preflightSeqRef.current ? result : null;
      } catch {
        return null;
      }
    },
    [getEngine],
  );

  const build = useCallback(
    (options: BuildOptions) =>
      run(async (engine) => {
        await dropHeldBuild(engine);
        const report = await engine.build(options, onProgress);
        heldOutputRef.current = true;
        setLastBuild(report);
        return report;
      }),
    [run, dropHeldBuild, onProgress],
  );

  // Quiet path for the verification dialog, which shows its own progress
  // state: no run() mutex (Cancel's discard must not be starved) and no
  // overlay timer strobing above the dialog.
  const renderComparison = useCallback(
    async (
      pageId: PageId,
      maxEdgePx: number,
    ): Promise<ComparisonPair | null> => {
      try {
        return await getEngine().renderComparison(pageId, maxEdgePx);
      } catch {
        return null;
      }
    },
    [getEngine],
  );

  const takeOutput = useCallback(
    () =>
      run(async (engine) => {
        const out = await engine.takeOutput();
        heldOutputRef.current = false;
        // The held build is consumed; keeping lastBuild would let export
        // paths take again and hit "No built output" (review finding).
        setLastBuild(null);
        return out;
      }),
    [run],
  );

  // Not routed through run(): cancelling the verification dialog must always
  // discard, even while a comparison render is in flight. State clears
  // synchronously; the worker serializes the actual discard.
  const discardOutput = useCallback(async () => {
    heldOutputRef.current = false;
    setLastBuild(null);
    await engineRef.current?.discardOutput().catch(() => {});
  }, []);

  const exportRange = useCallback(
    (pages: readonly PageRef[], fileName: string) =>
      run(async (engine): Promise<boolean | null> => {
        const snapshot = modelRef.current;
        if (!snapshot || pages.length === 0) return null;
        await dropHeldBuild(engine);
        await engine.applyModel(pages);
        try {
          await engine.build(
            { compression: { targetBytes: null } },
            onProgress,
          );
          const out = await engine.takeOutput();
          await new LocalDownloadSink().save({
            name: fileName,
            bytes: out.bytes,
          });
          return true;
        } finally {
          // Restore the full session no matter what failed above; also drop
          // any half-built output so nothing stays held.
          await engine.discardOutput().catch(() => {});
          adoptModel(await engine.applyModel(snapshot.pages));
        }
      }),
    [run, dropHeldBuild, onProgress, adoptModel],
  );

  const resetAll = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setActing(true);
    try {
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine) {
        await engine.reset().catch(() => {});
        engine.terminate();
      }
    } finally {
      runningRef.current = false;
    }
    heldOutputRef.current = false;
    for (const job of previewQueueRef.current) job.resolve(null);
    previewQueueRef.current = [];
    queueRef.current = [];
    queuedRef.current.clear();
    thumbGenRef.current.clear();
    inFlightRef.current = 0;
    previewInFlightRef.current = 0;
    for (const thumb of thumbsRef.current.values()) {
      URL.revokeObjectURL(thumb.url);
    }
    thumbsRef.current.clear();
    modelRef.current = null;
    setDocuments([]);
    setModel(null);
    setThumbnails(new Map());
    setLastBuild(null);
    setError(null);
    setBusy(IDLE);
    setActing(false);
  }, []);

  // Teardown on unmount: kill the worker, free every object URL.
  useEffect(() => {
    const thumbs = thumbsRef.current;
    return () => {
      engineRef.current?.terminate();
      engineRef.current = null;
      for (const thumb of thumbs.values()) URL.revokeObjectURL(thumb.url);
      thumbs.clear();
    };
  }, []);

  const inputWarning =
    model && model.totalSourceBytes > INPUT_WARNING_BYTES
      ? `Total input is over 300 MB. Processing may be slow or run out of browser memory - consider splitting into smaller packages.`
      : null;

  return {
    documents,
    model,
    thumbnails,
    busy,
    acting,
    error,
    inputWarning,
    lastBuild,
    loadFiles,
    reorder,
    deletePages,
    applyModel,
    renderPreview,
    preflight,
    build,
    renderComparison,
    takeOutput,
    discardOutput,
    exportRange,
    resetAll,
  };
}
