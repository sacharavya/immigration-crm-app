"use client";

// Owns the PDF engine lifecycle for the submission tool: lazy worker startup,
// the working model, a small thumbnail render queue, busy/progress state, and
// typed actions. All heavy work happens in the worker; this hook only moves
// handles and object URLs.

import { useCallback, useEffect, useRef, useState } from "react";

import { createPdfEngineClient, type PdfEngineClient } from "@/lib/pdf-engine";
import { LocalFileSource } from "@/lib/pdf-engine/sources/local";
import type {
  BuildOptions,
  BuildReport,
  ComparisonPair,
  CompressionPreflight,
  LoadedDocument,
  PageId,
  PageModel,
  ProgressEvent,
  ProgressPhase,
  Rotation,
} from "@/lib/pdf-engine/types";

const THUMBNAIL_EDGE_PX = 320;
const THUMBNAIL_CONCURRENCY = 2;
/** Above this total input size the UI shows a slow/memory warning. */
export const INPUT_WARNING_BYTES = 300_000_000;
/** Operations shorter than this never show the progress overlay. */
const OVERLAY_DELAY_MS = 300;

export interface BusyState {
  active: boolean;
  phase: ProgressPhase | null;
  completed: number;
  total: number;
  note?: string;
}

const IDLE: BusyState = { active: false, phase: null, completed: 0, total: 0 };

export interface UsePdfEngine {
  documents: LoadedDocument[];
  model: PageModel | null;
  /** PageId -> object URL of a rendered PNG thumbnail. */
  thumbnails: ReadonlyMap<PageId, string>;
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
  loadFiles: (files: File[]) => Promise<void>;
  reorder: (orderedPageIds: readonly PageId[]) => Promise<void>;
  rotateBy90: (pageId: PageId) => Promise<void>;
  deletePages: (pageIds: readonly PageId[]) => Promise<void>;
  preflight: (options: BuildOptions) => Promise<CompressionPreflight | null>;
  build: (options: BuildOptions) => Promise<BuildReport | null>;
  renderComparison: (
    pageId: PageId,
    maxEdgePx: number,
  ) => Promise<ComparisonPair | null>;
  takeOutput: () => Promise<{ bytes: Uint8Array; sizeBytes: number } | null>;
  discardOutput: () => Promise<void>;
  resetAll: () => Promise<void>;
}

export function usePdfEngine(): UsePdfEngine {
  const [documents, setDocuments] = useState<LoadedDocument[]>([]);
  const [model, setModel] = useState<PageModel | null>(null);
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<PageId, string>>(
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

  const thumbsRef = useRef<Map<PageId, string>>(new Map());
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
            if (previous) URL.revokeObjectURL(previous);
            thumbsRef.current.set(pageId, url);
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

  const enqueueThumbnail = useCallback(
    (pageId: PageId) => {
      if (thumbsRef.current.has(pageId) || queuedRef.current.has(pageId))
        return;
      queuedRef.current.add(pageId);
      queueRef.current.push(pageId);
    },
    [],
  );

  /** Drop the cached render for a page (rotation changed) and re-queue it. */
  const invalidateThumbnail = useCallback(
    (pageId: PageId) => {
      // Bump the generation so an in-flight render's stale raster is dropped.
      thumbGenRef.current.set(
        pageId,
        (thumbGenRef.current.get(pageId) ?? 0) + 1,
      );
      const url = thumbsRef.current.get(pageId);
      if (url) {
        URL.revokeObjectURL(url);
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
  const applyModel = useCallback(
    (next: PageModel) => {
      modelRef.current = next;
      setModel(next);
      const live = new Set(next.pages.map((p) => p.id));
      for (const [pageId, url] of thumbsRef.current) {
        if (!live.has(pageId)) {
          URL.revokeObjectURL(url);
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
  // Action runner: re-entry guard + delayed progress overlay + error capture.
  // -------------------------------------------------------------------------
  const run = useCallback(
    async <T,>(
      fn: (engine: PdfEngineClient) => Promise<T>,
    ): Promise<T | null> => {
      if (runningRef.current) return null;
      runningRef.current = true;
      // Flip acting immediately so the UI disables now, not at the 300 ms
      // overlay mark; otherwise a second click in that window is dropped
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
  const dropHeldBuild = useCallback(
    async (engine: PdfEngineClient) => {
      setLastBuild(null);
      if (!heldOutputRef.current) return;
      heldOutputRef.current = false;
      await engine.discardOutput().catch(() => {});
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------
  const loadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      await run(async (engine) => {
        await dropHeldBuild(engine);
        const source = new LocalFileSource(files);
        const items = await source.list();
        const inputs = await Promise.all(items.map((i) => source.fetch(i)));
        const result = await engine.loadDocuments(inputs, onProgress);
        setDocuments((prev) => [...prev, ...result.documents]);
        applyModel(result.model);
      });
    },
    [run, dropHeldBuild, onProgress, applyModel],
  );

  const reorder = useCallback(
    async (orderedPageIds: readonly PageId[]) => {
      await run(async (engine) => {
        await dropHeldBuild(engine);
        applyModel(await engine.reorder(orderedPageIds));
      });
    },
    [run, dropHeldBuild, applyModel],
  );

  const rotateBy90 = useCallback(
    async (pageId: PageId) => {
      await run(async (engine) => {
        const page = modelRef.current?.pages.find((p) => p.id === pageId);
        if (!page) return;
        const next = ((page.rotation + 90) % 360) as Rotation;
        await dropHeldBuild(engine);
        const nextModel = await engine.rotate(pageId, next);
        invalidateThumbnail(pageId);
        applyModel(nextModel);
      });
    },
    [run, dropHeldBuild, invalidateThumbnail, applyModel],
  );

  const deletePages = useCallback(
    async (pageIds: readonly PageId[]) => {
      if (pageIds.length === 0) return;
      await run(async (engine) => {
        await dropHeldBuild(engine);
        applyModel(await engine.deletePages(pageIds));
      });
    },
    [run, dropHeldBuild, applyModel],
  );

  // Background/advisory, so it bypasses run(): it must never block user
  // actions, pop the overlay, or be dropped by the mutex (the worker
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
    queueRef.current = [];
    queuedRef.current.clear();
    thumbGenRef.current.clear();
    inFlightRef.current = 0;
    for (const url of thumbsRef.current.values()) URL.revokeObjectURL(url);
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
      for (const url of thumbs.values()) URL.revokeObjectURL(url);
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
    rotateBy90,
    deletePages,
    preflight,
    build,
    renderComparison,
    takeOutput,
    discardOutput,
    resetAll,
  };
}
