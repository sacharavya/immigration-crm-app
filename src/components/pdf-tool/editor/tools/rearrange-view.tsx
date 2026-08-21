"use client";

// Rearrange mode: replaces the canvas with a grid of every page for fast
// drag-reordering, reusing the rail's thumbnail cache. Done returns to Select.

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
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PageId, PageModel, PageRef } from "@/lib/pdf-engine/types";

import type { PageThumb } from "../../use-pdf-engine";

function GridThumb({
  page,
  index,
  thumb,
  disabled,
}: {
  page: PageRef;
  index: number;
  thumb: PageThumb | undefined;
  disabled: boolean;
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
      className={`flex cursor-grab flex-col items-center gap-1.5 rounded-xl bg-stone-700/50 p-2 touch-none select-none ${
        isDragging ? "z-10 opacity-70 shadow-lg" : ""
      }`}
    >
      <div className="flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-md bg-white shadow-sm">
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
      <span className="text-xs font-medium text-stone-300">{index + 1}</span>
    </div>
  );
}

export function RearrangeView({
  model,
  thumbnails,
  disabled,
  onReorder,
  onDone,
}: {
  model: PageModel | null;
  thumbnails: ReadonlyMap<PageId, PageThumb>;
  disabled: boolean;
  onReorder: (orderedPageIds: readonly PageId[]) => void;
  onDone: () => void;
}) {
  const sensors = useSensors(
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
    <div className="flex flex-1 flex-col overflow-hidden bg-stone-800">
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-2">
        <span className="text-sm font-medium text-stone-200">
          Drag pages to rearrange
        </span>
        <Button size="sm" onClick={onDone}>
          <Check data-icon="inline-start" />
          Done
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={pageIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              {pages.map((page, index) => (
                <GridThumb
                  key={page.id}
                  page={page}
                  index={index}
                  thumb={thumbnails.get(page.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
