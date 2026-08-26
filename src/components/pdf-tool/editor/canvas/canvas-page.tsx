"use client";

// One page in the continuous canvas. Renders a real preview only while
// visible (IntersectionObserver); offscreen pages show an aspect-correct
// placeholder. Re-renders when the settled zoom or the page rotation changes.

import { useEffect, useRef, useState } from "react";

import type { PageId, PageRef, Thumbnail } from "@/lib/pdf-engine/types";

import type { PageClickModifiers } from "../sidebar/thumbnail-rail";

/** Preview raster max edge at zoom 1; multiplied by the settled zoom. */
const PREVIEW_BASE_EDGE_PX = 900;
/** CSS width of a portrait page at zoom 1. */
const DISPLAY_BASE_WIDTH_PX = 680;
/** US letter height/width, used until real dimensions are known. */
const DEFAULT_ASPECT = 11 / 8.5;

interface Raster {
  url: string;
  width: number;
  height: number;
  /** zoom:rotation the raster was rendered for. */
  key: string;
}

export function CanvasPage({
  page,
  index,
  zoom,
  settledZoom,
  selected,
  thumbAspect,
  renderPreview,
  onVisibilityChange,
  onClick,
}: {
  page: PageRef;
  index: number;
  /** Live zoom - scales the CSS box immediately. */
  zoom: number;
  /** Debounced zoom - triggers the actual re-render when it settles. */
  settledZoom: number;
  selected: boolean;
  /** height/width from the thumbnail cache, when known. */
  thumbAspect: number | null;
  renderPreview: (
    pageId: PageId,
    maxEdgePx: number,
    signal?: AbortSignal,
  ) => Promise<Thumbnail | null>;
  onVisibilityChange: (pageId: PageId, visible: boolean) => void;
  onClick: (pageId: PageId, mods: PageClickModifiers) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [raster, setRaster] = useState<Raster | null>(null);
  const rasterRef = useRef<Raster | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const pageId = page.id;
    // ponytail: one observer per page; a shared observer only matters past
    // ~1000-page sessions.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        onVisibilityChange(pageId, entry.isIntersecting);
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      onVisibilityChange(pageId, false);
    };
  }, [page.id, onVisibilityChange]);

  const renderKey = `${settledZoom}:${page.rotation}`;

  useEffect(() => {
    if (!visible || rasterRef.current?.key === renderKey) return;
    // Abort on cleanup (scrolled past, zoom changed, unmount): a queued
    // render is skipped before it ever reaches the worker.
    const controller = new AbortController();
    void renderPreview(
      page.id,
      Math.round(PREVIEW_BASE_EDGE_PX * settledZoom),
      controller.signal,
    ).then((thumb) => {
      if (controller.signal.aborted || !thumb) return;
      const url = URL.createObjectURL(
        new Blob([thumb.png as BlobPart], { type: "image/png" }),
      );
      if (rasterRef.current) URL.revokeObjectURL(rasterRef.current.url);
      const next: Raster = {
        url,
        width: thumb.width,
        height: thumb.height,
        key: renderKey,
      };
      rasterRef.current = next;
      setRaster(next);
    });
    return () => {
      controller.abort();
    };
  }, [visible, renderKey, settledZoom, page.id, renderPreview]);

  // Evict the raster when the page leaves the viewport: a 250-page scanned
  // package would otherwise pin hundreds of MB of PNG blobs after one full
  // scroll (review finding). The aspect ratio is remembered below so the
  // placeholder keeps the correct size and re-entry re-renders seamlessly.
  const lastAspectRef = useRef<number | null>(null);
  useEffect(() => {
    if (visible || !rasterRef.current) return;
    lastAspectRef.current =
      rasterRef.current.width > 0
        ? rasterRef.current.height / rasterRef.current.width
        : null;
    URL.revokeObjectURL(rasterRef.current.url);
    rasterRef.current = null;
    setRaster(null);
  }, [visible]);

  // Revoke the held raster on unmount.
  useEffect(
    () => () => {
      if (rasterRef.current) {
        URL.revokeObjectURL(rasterRef.current.url);
        rasterRef.current = null;
      }
    },
    [],
  );

  const aspect =
    raster && raster.width > 0
      ? raster.height / raster.width
      : (lastAspectRef.current ?? thumbAspect ?? DEFAULT_ASPECT);
  const width = Math.round(DISPLAY_BASE_WIDTH_PX * zoom);
  const height = Math.round(width * aspect);

  return (
    <div
      ref={containerRef}
      id={`canvas-page-${page.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Page ${index + 1}`}
      onClick={(e) =>
        onClick(page.id, {
          toggle: e.metaKey || e.ctrlKey,
          range: e.shiftKey,
        })
      }
      className={`relative shrink-0 cursor-pointer overflow-hidden rounded-sm bg-white shadow-md outline-none ${
        selected ? "ring-3 ring-[var(--primary)]" : ""
      }`}
      style={{ width, height }}
    >
      {raster ? (
        // Object URL from the worker render; next/image adds nothing here.
        <img
          src={raster.url}
          alt={`Page ${index + 1}`}
          draggable={false}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-stone-100" />
      )}
      <span className="absolute bottom-1.5 left-1.5 rounded bg-stone-900/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {index + 1}
      </span>
    </div>
  );
}
