"use client";

// Bottom-right non-blocking progress toast for quiet operations (load,
// reorder, rotate, delete, split). The hook only flips busy.active past the
// 300 ms mark, so short ops never flash it. Export builds use the full
// ProgressOverlay instead.

import { PHASE_LABELS } from "../progress-overlay";
import type { BusyState } from "../use-pdf-engine";

export function ProgressToast({ busy }: { busy: BusyState }) {
  if (!busy.active) return null;

  const label = busy.phase ? PHASE_LABELS[busy.phase] : "Working";
  const percent =
    busy.total > 0
      ? Math.min(100, Math.round((busy.completed / busy.total) * 100))
      : null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-50 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-stone-200">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-stone-900">{label}</span>
        {percent !== null && <span className="text-stone-500">{percent}%</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div
          className={`h-full rounded-full bg-[var(--primary)] transition-[width] duration-200 ${
            percent === null ? "w-full animate-pulse" : ""
          }`}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      {busy.note && (
        <p className="mt-1.5 truncate text-[11px] text-stone-500">{busy.note}</p>
      )}
    </div>
  );
}
