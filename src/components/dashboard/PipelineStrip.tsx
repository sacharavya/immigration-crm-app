import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import type { PipelinePhase } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

// A rail per phase, read left to right: phases 1-3 are the firm's own work
// (navy, darkening as the file matures), 4 is waiting on IRCC (amber), 5 is
// the outcome (mint). The colour is a position cue, never the only signal —
// every card still names its phase and its sub-count in words.
const RAIL: Record<number, string> = {
  1: "bg-navy-200",
  2: "bg-navy-400",
  3: "bg-navy-600",
  4: "bg-warning",
  5: "bg-gold",
};

export function PipelineStrip({ phases }: { phases: PipelinePhase[] }) {
  const total = phases.reduce((n, p) => n + p.count, 0);
  const onUs = phases.reduce((n, p) => (p.withIrcc ? n : n + p.onUs), 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Pipeline
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {total} active
            {onUs > 0 && (
              <>
                {" · "}
                <span className="font-medium text-[var(--warning-text)]">
                  {onUs} waiting on us
                </span>
              </>
            )}
          </span>
        </div>
        <Link
          href="/dashboard/cases?view=board"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Open board
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {phases.map((p) => (
          <Link
            key={p.phase}
            href={p.href}
            className="group overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <span aria-hidden className={cn("block h-[3px]", RAIL[p.phase])} />
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {p.phase}. {p.label}
                </span>
                <ArrowUpRight
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>

              <div className="mt-3 text-[28px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">
                {p.count}
              </div>

              <div className="mt-2.5">
                {p.withIrcc ? (
                  <span className="text-[11px] text-[var(--subtle-foreground)]">
                    with IRCC
                  </span>
                ) : p.onUs > 0 ? (
                  <span className="inline-flex rounded-full bg-[var(--warning-subtle)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[var(--warning-text)]">
                    {p.onUs} on us
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--subtle-foreground)]">
                    nothing on us
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
