"use client";

// Vertical numbered thumbnail rail: multi-select (click / Cmd / Shift),
// dnd-kit reorder driving engine.reorder, current-page ring, and an Add page
// button that opens the Merge dialog. Thumbnails come from the hook's cache.

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PageId, PageModel, PageRef } from "@/lib/pdf-engine/types";

import type { PageThumb } from "../../use-pdf-engine";
import { useEditor } from "../editor-store";

export interface PageClickModifiers {
  toggle: boolean;
  range: boolean;
}

function RailThumb({
  page,
  index,
  thumb,
  selected,
  current,
  disabled,
  onClick,
}: {
  page: PageRef;
  index: number;
  thumb: PageThumb | undefined;
  selected: boolean;
  current: boolean;
  disabled: boolean;
  onClick: (pageId: PageId, mods: PageClickModifiers) => void;
}) {
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
      onClick={(e) =>
        onClick(page.id, {
          toggle: e.metaKey || e.ctrlKey,
          range: e.shiftKey,
        })
      }
      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg p-1.5 touch-none select-none ${
        isDragging ? "z-10 opacity-70" : ""
      } ${selected ? "bg-[var(--primary)]/10" : "hover:bg-stone-100"}`}
    >
      <div
        className={`flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ${
          current
            ? "ring-2 ring-[var(--primary)]"
            : selected
              ? "ring-[var(--primary)]/60"
              : "ring-stone-200"
        }`}
      >
        {thumb ? (
          // Object URL from the worker render; next/image adds nothing here.
          <img
            src={thumb.url}
            alt={`Page ${index + 1}`}
            draggable={false}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-stone-200" />
        )}
      </div>
      <span
        className={`text-[11px] font-medium ${
          selected ? "text-[var(--primary)]" : "text-stone-500"
        }`}
      >
        {index + 1}
      </span>
    </div>
  );
}

export function ThumbnailRail({
  model,
  thumbnails,
  disabled,
  onReorder,
  onPageClick,
  onAddPage,
}: {
  model: PageModel | null;
  thumbnails: ReadonlyMap<PageId, PageThumb>;
  disabled: boolean;
  onReorder: (orderedPageIds: readonly PageId[]) => void;
  onPageClick: (pageId: PageId, mods: PageClickModifiers) => void;
  onAddPage: () => void;
}) {
  const { state } = useEditor();
  const sensors = useSensors(
    // The distance constraint keeps plain clicks from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const pages = model?.pages ?? [];
  const pageIds = pages.map((p) => p.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pageIds.indexOf(active.id as PageId);
    const to = pageIds.indexOf(over.id as PageId);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(pageIds, from, to));
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-stone-50">
      <div className="border-b border-stone-200 p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={disabled}
          onClick={onAddPage}
        >
          <Plus data-icon="inline-start" />
          Add page
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pageIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1">
              {pages.map((page, index) => (
                <RailThumb
                  key={page.id}
                  page={page}
                  index={index}
                  thumb={thumbnails.get(page.id)}
                  selected={state.selection.has(page.id)}
                  current={state.currentPage === page.id}
                  disabled={disabled}
                  onClick={onPageClick}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
