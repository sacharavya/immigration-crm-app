"use client";

import type { ProgressPhase } from "@/lib/pdf-engine/types";

import type { BusyState } from "./use-pdf-engine";

const PHASE_LABELS: Record<ProgressPhase, string> = {
  loading: "Loading documents",
  rendering: "Rendering pages",
  merging: "Merging pages",
  numbering: "Adding page numbers",
  compressing: "Compressing",
  finalizing: "Finalizing",
};

/** Modal progress overlay; the hook only sets `active` past the 300 ms mark. */
export function ProgressOverlay({ busy }: { busy: BusyState }) {
  if (!busy.active) return null;

  const label = busy.phase ? PHASE_LABELS[busy.phase] : "Working";
  const percent =
    busy.total > 0
      ? Math.min(100, Math.round((busy.completed / busy.total) * 100))
      : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 supports-backdrop-filter:backdrop-blur-xs">
      <div className="w-72 rounded-xl bg-white p-4 shadow-lg ring-1 ring-stone-200">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-stone-900">{label}</span>
          {percent !== null && (
            <span className="text-stone-500">{percent}%</span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div
            className={`h-full rounded-full bg-[var(--primary)] transition-[width] duration-200 ${
              percent === null ? "w-full animate-pulse" : ""
            }`}
            style={percent === null ? undefined : { width: `${percent}%` }}
          />
        </div>
        {busy.note && (
          <p className="mt-2 truncate text-xs text-stone-500">{busy.note}</p>
        )}
      </div>
    </div>
  );
}
