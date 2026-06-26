import Link from "next/link";

import type { PipelinePhase } from "@/lib/dashboard/types";

export function PipelineStrip({ phases }: { phases: PipelinePhase[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Pipeline
          </h2>
          <p className="text-xs text-muted-foreground">
            Active cases by phase. Click to open the board.
          </p>
        </div>
        <Link
          href="/dashboard/cases?view=board"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Open board
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {phases.map((p) => (
          <Link
            key={p.phase}
            href={p.href}
            className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-[var(--border-secondary)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {p.phase}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {p.label}
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {p.count}
            </div>
            {p.withIrcc ? (
              <div className="mt-1 text-[11px] text-[var(--subtle-foreground)]">
                with IRCC
              </div>
            ) : (
              <div
                className={
                  p.onUs > 0
                    ? "mt-1 text-[11px] font-medium text-primary"
                    : "mt-1 text-[11px] text-[var(--subtle-foreground)]"
                }
              >
                {p.onUs} on us
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
