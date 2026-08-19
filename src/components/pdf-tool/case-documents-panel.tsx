"use client";

import { FileText, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { formatBytes } from "./presets";

export interface CaseDocumentItem {
  id: string;
  name: string;
  mime: string;
  sizeBytes: number;
  category: string | null;
}

// Lists the case's uploaded documents so staff can pull them straight into
// the package. Bytes are fetched browser-to-Microsoft via a short-lived
// download URL minted per click; nothing routes through our server.
export function CaseDocumentsPanel({
  items,
  onAdd,
  disabled,
}: {
  items: CaseDocumentItem[];
  onAdd: (items: CaseDocumentItem[]) => Promise<void>;
  disabled: boolean;
}) {
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [addedIds, setAddedIds] = useState<ReadonlySet<string>>(new Set());
  const [allPending, setAllPending] = useState(false);

  async function addOne(item: CaseDocumentItem) {
    setPendingIds((s) => new Set(s).add(item.id));
    try {
      await onAdd([item]);
      setAddedIds((s) => new Set(s).add(item.id));
    } finally {
      setPendingIds((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
    }
  }

  async function addAll() {
    const remaining = items.filter((i) => !addedIds.has(i.id));
    if (remaining.length === 0) return;
    setAllPending(true);
    try {
      await onAdd(remaining);
      setAddedIds((s) => {
        const n = new Set(s);
        for (const i of remaining) n.add(i.id);
        return n;
      });
    } finally {
      setAllPending(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-800">
          Case documents ({items.length})
        </h2>
        <button
          type="button"
          onClick={addAll}
          disabled={disabled || allPending || addedIds.size === items.length}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          {allPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add all
        </button>
      </div>
      <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const added = addedIds.has(item.id);
          const pending = pendingIds.has(item.id);
          return (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-stone-50"
            >
              <FileText className="h-4 w-4 shrink-0 text-stone-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-stone-800">
                  {item.name}
                </div>
                <div className="text-[11px] text-stone-500">
                  {item.category ? `${item.category} · ` : ""}
                  {formatBytes(item.sizeBytes)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void addOne(item)}
                disabled={disabled || pending || added}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-stone-200 bg-white px-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : added ? (
                  "Added"
                ) : (
                  "Add"
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
