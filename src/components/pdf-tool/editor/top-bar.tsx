"use client";

// Top chrome: inline-editable title (drives the export file name), undo/redo,
// zoom stepper, and the primary Download button on the right.

import { Download, Minus, Plus, Redo2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ZOOM_MAX, ZOOM_MIN } from "./editor-store";

export function TopBar({
  title,
  onTitleChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomStep,
  canDownload,
  downloading,
  onDownload,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomStep: (direction: 1 | -1) => void;
  canDownload: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-2">
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="File name"
        className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-stone-900 outline-none hover:border-stone-200 focus:border-stone-300 focus:bg-white"
      />

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo2 />
          <span className="sr-only">Undo</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo2 />
          <span className="sr-only">Redo</span>
        </Button>
      </div>

      <div className="flex items-center rounded-lg border border-stone-200">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Zoom out"
          disabled={zoom <= ZOOM_MIN}
          onClick={() => onZoomStep(-1)}
        >
          <Minus />
          <span className="sr-only">Zoom out</span>
        </Button>
        <span className="w-12 text-center text-xs font-medium text-stone-700 tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Zoom in"
          disabled={zoom >= ZOOM_MAX}
          onClick={() => onZoomStep(1)}
        >
          <Plus />
          <span className="sr-only">Zoom in</span>
        </Button>
      </div>

      <Button disabled={!canDownload || downloading} onClick={onDownload}>
        <Download data-icon="inline-start" />
        Download
      </Button>
    </div>
  );
}
