"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RotateCwIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PageRef } from "@/lib/pdf-engine/types";

interface PageThumbnailProps {
  page: PageRef;
  /** 0-based position in the model order. */
  index: number;
  docName: string;
  thumbUrl: string | undefined;
  disabled: boolean;
  onRotate: () => void;
  onDelete: () => void;
}

export function PageThumbnail({
  page,
  index,
  docName,
  thumbUrl,
  disabled,
  onRotate,
  onDelete,
}: PageThumbnailProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group relative flex cursor-grab flex-col overflow-hidden rounded-xl border border-stone-200 bg-white touch-none select-none ${
        isDragging ? "z-10 opacity-70 shadow-lg" : ""
      }`}
    >
      <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-stone-50 p-1.5">
        {thumbUrl ? (
          // Object URL from the worker render; next/image adds nothing here.
          <img
            src={thumbUrl}
            alt={`Page ${index + 1}`}
            draggable={false}
            className="max-h-full max-w-full rounded-sm object-contain shadow-sm"
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-sm bg-stone-200" />
        )}
      </div>

      <div className="flex items-center gap-1.5 border-t border-stone-100 px-2 py-1.5">
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-stone-900 px-1 text-[11px] font-medium text-white">
          {index + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-stone-500">
          {docName}
        </span>
      </div>

      {!disabled && (
        <div className="absolute top-1.5 right-1.5 hidden gap-1 group-hover:flex">
          <Button
            variant="secondary"
            size="icon-xs"
            className="shadow-sm"
            title="Rotate 90 degrees"
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
          >
            <RotateCwIcon />
            <span className="sr-only">Rotate page {index + 1}</span>
          </Button>
          <Button
            variant="destructive"
            size="icon-xs"
            className="bg-white shadow-sm"
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2Icon />
            <span className="sr-only">Delete page {index + 1}</span>
          </Button>
        </div>
      )}
    </div>
  );
}
