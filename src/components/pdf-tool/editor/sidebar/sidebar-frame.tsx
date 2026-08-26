"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH_KEY = "pdfTool.sidebarWidth";
const SPLIT_KEY = "pdfTool.sidebarSplit";
const MIN_W = 180;
const MAX_W = 520;
const MIN_SECTION = 96;

function readStored(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const n = Number(window.localStorage.getItem(key));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// User-adjustable sidebar: drag the right edge to resize the whole column,
// drag the divider between the two sections to rebalance them. Both sections
// scroll independently so many case files can never bury the page rail.
export function SidebarFrame({
  filesPanel,
  rail,
}: {
  filesPanel?: React.ReactNode;
  rail: React.ReactNode;
}) {
  // Start with the SSR fallbacks and apply stored values after mount:
  // reading localStorage in the initializer causes a hydration mismatch on
  // the style attribute (review finding).
  const [width, setWidth] = useState(240);
  const [filesHeight, setFilesHeight] = useState(320);
  useEffect(() => {
    setWidth(readStored(WIDTH_KEY, 240));
    setFilesHeight(readStored(SPLIT_KEY, 320));
  }, []);
  const frameRef = useRef<HTMLDivElement>(null);

  const startWidthDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = width;
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const next = Math.min(MAX_W, Math.max(MIN_W, startW + ev.clientX - startX));
        setWidth(next);
      };
      const up = (ev: PointerEvent) => {
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          // capture already auto-released (pointercancel)
        }
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setWidth((w) => {
          window.localStorage.setItem(WIDTH_KEY, String(w));
          return w;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [width],
  );

  const startSplitDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startH = filesHeight;
      const max = Math.max(
        MIN_SECTION,
        (frameRef.current?.clientHeight ?? 600) - MIN_SECTION,
      );
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const next = Math.min(max, Math.max(MIN_SECTION, startH + ev.clientY - startY));
        setFilesHeight(next);
      };
      const up = (ev: PointerEvent) => {
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          // capture already auto-released (pointercancel)
        }
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setFilesHeight((h) => {
          window.localStorage.setItem(SPLIT_KEY, String(h));
          return h;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [filesHeight],
  );

  return (
    <div
      ref={frameRef}
      className="relative flex min-h-0 shrink-0 flex-col border-r border-stone-200"
      style={{ width }}
    >
      {filesPanel ? (
        <>
          <div
            className="flex min-h-0 flex-col overflow-hidden"
            style={{ height: filesHeight }}
          >
            {filesPanel}
          </div>
          <div
            role="separator"
            aria-orientation="horizontal"
            onPointerDown={startSplitDrag}
            className="h-1.5 shrink-0 cursor-row-resize border-y border-stone-200 bg-stone-100 transition-colors hover:bg-stone-300"
            title="Drag to resize sections"
          />
        </>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">{rail}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startWidthDrag}
        className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize transition-colors hover:bg-stone-300"
        title="Drag to resize sidebar"
      />
    </div>
  );
}
