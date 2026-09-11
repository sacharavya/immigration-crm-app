"use client";

import { useState } from "react";

import type { RadarAxis, RadarData } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

type View = "service" | "category";

// Ranked bar list, one row per service or category. A radar chart collided
// past a handful of axes; bars stay readable at any count. Rows with
// decisions rank first (by rate, then sample size); rows with no decisions
// sit dimmed below with their count.
function sortAxes(axes: RadarAxis[]): RadarAxis[] {
  return [...axes].sort((a, b) => {
    const aScored = a.successRate !== null;
    const bScored = b.successRate !== null;
    if (aScored !== bScored) return aScored ? -1 : 1;
    if (aScored && bScored) {
      if (b.successRate! !== a.successRate!) {
        return b.successRate! - a.successRate!;
      }
      return b.decidedCount - a.decidedCount;
    }
    return a.label.localeCompare(b.label);
  });
}

function caseLabel(n: number): string {
  return `${n} case${n === 1 ? "" : "s"}`;
}

export function SuccessRadar({ data }: { data: RadarData }) {
  const [view, setView] = useState<View>("service");
  const axes = sortAxes(data[view]);

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Success rate by service
          </h2>
          <p className="text-xs text-muted-foreground">
            Approvals over decisions, last 12 months.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Success rate grouping"
          className="flex shrink-0 overflow-hidden rounded-md border border-border text-[11px] font-medium"
        >
          {(["service", "category"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "px-2.5 py-1 capitalize transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {axes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No services configured yet.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {axes.map((a) => {
              const scored = a.successRate !== null;
              const pct = scored ? Math.round(a.successRate! * 100) : 0;
              return (
                <li key={a.key} className={cn(!scored && "opacity-60")}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="min-w-0 truncate text-xs font-medium text-foreground"
                      title={a.label}
                    >
                      {a.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                      {scored
                        ? `${pct}%, ${caseLabel(a.decidedCount)}`
                        : caseLabel(a.decidedCount)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${a.label}: ${
                      scored
                        ? `${pct} percent approval over ${caseLabel(a.decidedCount)}`
                        : `no decided cases`
                    }`}
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
