"use client";

// Continuous vertical page canvas on a neutral dark background. Virtualized:
// each CanvasPage only renders its preview while visible. Tracks the topmost
// visible page and reports it as the current page for the rail's ring.

import { useCallback, useEffect, useRef, useState } from "react";

import type { PageId, PageModel, Thumbnail } from "@/lib/pdf-engine/types";

import type { PageThumb } from "../../use-pdf-engine";
import { useEditor } from "../editor-store";
import type { PageClickModifiers } from "../sidebar/thumbnail-rail";
import { CanvasPage } from "./canvas-page";

/** How long zoom changes settle before previews re-render. */
const ZOOM_SETTLE_MS = 250;

export function PageCanvas({
  model,
  thumbnails,
  renderPreview,
  onPageClick,
  onAddPage,
}: {
  model: PageModel | null;
  thumbnails: ReadonlyMap<PageId, PageThumb>;
  renderPreview: (
    pageId: PageId,
    maxEdgePx: number,
    signal?: AbortSignal,
  ) => Promise<Thumbnail | null>;
  onPageClick: (pageId: PageId, mods: PageClickModifiers) => void;
  onAddPage: () => void;
}) {
  const { state, dispatch } = useEditor();

  const [settledZoom, setSettledZoom] = useState(state.zoom);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSettledZoom(state.zoom),
      ZOOM_SETTLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [state.zoom]);

  // Visibility bookkeeping -> current page = first visible in model order.
  const visibleRef = useRef<Map<PageId, boolean>>(new Map());
  const modelRef = useRef(model);
  const currentRef = useRef(state.currentPage);
  useEffect(() => {
    modelRef.current = model;
    currentRef.current = state.currentPage;
  });

  const handleVisibilityChange = useCallback(
    (pageId: PageId, visible: boolean) => {
      visibleRef.current.set(pageId, visible);
      const first = modelRef.current?.pages.find((p) =>
        visibleRef.current.get(p.id),
      );
      if (first && first.id !== currentRef.current) {
        dispatch({ type: "current/set", pageId: first.id });
      }
    },
    [dispatch],
  );

  if (!model || model.pages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-stone-800">
        <button
          type="button"
          onClick={onAddPage}
          className="rounded-xl border-2 border-dashed border-stone-600 px-10 py-8 text-center text-sm text-stone-300 transition-colors hover:border-stone-400 hover:text-white"
        >
          <span className="block text-base font-medium">No pages yet</span>
          <span className="mt-1 block text-stone-400">
            Click to add PDFs or images
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-800">
      <div className="flex min-h-full flex-col items-center gap-6 px-6 py-8">
        {model.pages.map((page, index) => {
          const thumb = thumbnails.get(page.id);
          return (
            <CanvasPage
              key={page.id}
              page={page}
              index={index}
              zoom={state.zoom}
              settledZoom={settledZoom}
              selected={state.selection.has(page.id)}
              thumbAspect={
                thumb && thumb.width > 0 ? thumb.height / thumb.width : null
              }
              renderPreview={renderPreview}
              onVisibilityChange={handleVisibilityChange}
              onClick={onPageClick}
            />
          );
        })}
      </div>
    </div>
  );
}
