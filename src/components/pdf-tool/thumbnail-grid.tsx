"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import type {
  DocumentId,
  LoadedDocument,
  PageId,
  PageModel,
} from "@/lib/pdf-engine/types";

import { PageThumbnail } from "./page-thumbnail";

interface ThumbnailGridProps {
  model: PageModel | null;
  documents: LoadedDocument[];
  thumbnails: ReadonlyMap<PageId, string>;
  disabled: boolean;
  onReorder: (orderedPageIds: readonly PageId[]) => void;
  onRotate: (pageId: PageId) => void;
  onDelete: (pageId: PageId) => void;
}

export function ThumbnailGrid({
  model,
  documents,
  thumbnails,
  disabled,
  onReorder,
  onRotate,
  onDelete,
}: ThumbnailGridProps) {
  const sensors = useSensors(
    // The distance constraint keeps plain clicks (rotate/delete) from
    // starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!model || model.pages.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border border-stone-200 bg-white p-12 text-center text-sm text-stone-500">
        No pages yet. Upload PDFs or images to start building the package.
      </div>
    );
  }

  const docNames = new Map<DocumentId, string>(
    documents.map((d) => [d.id, d.name]),
  );
  const pageIds = model.pages.map((p) => p.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = pageIds.indexOf(active.id as PageId);
    const to = pageIds.indexOf(over.id as PageId);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(pageIds, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pageIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {model.pages.map((page, index) => (
            <PageThumbnail
              key={page.id}
              page={page}
              index={index}
              docName={docNames.get(page.documentId) ?? "Unknown"}
              thumbUrl={thumbnails.get(page.id)}
              disabled={disabled}
              onRotate={() => onRotate(page.id)}
              onDelete={() => onDelete(page.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
