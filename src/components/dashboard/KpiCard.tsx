import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import Link from "next/link";

import {
  changeBadge,
  formatKpiValue,
  kpiCaption,
  type Favorable,
} from "@/lib/dashboard/metrics";
import type { KpiView } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

import { Sparkline } from "./Sparkline";

const BADGE_CLASS: Record<Favorable, string> = {
  good: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  bad: "bg-maple-50 text-maple-700",
  neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({ view, href }: { view: KpiView; href?: string }) {
  const badge = changeBadge({
    current: view.current,
    previous: view.previous,
    higherIsBetter: view.higherIsBetter,
  });
  const Arrow =
    badge.direction === "up"
      ? ArrowUpRight
      : badge.direction === "down"
        ? ArrowDownRight
        : null;

  const inner = (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors group-hover:border-[var(--border-secondary)]">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {view.label}
        </span>
        <span
          title={view.hint}
          className="inline-flex text-[var(--subtle-foreground)]"
        >
          <Info aria-hidden className="h-3.5 w-3.5" />
          <span className="sr-only">{view.hint}</span>
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            {formatKpiValue(view)}
          </span>
          {view.unit && (
            <span className="text-xs text-muted-foreground">{view.unit}</span>
          )}
        </div>

        <span
          role="img"
          aria-label={badge.ariaLabel}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
            BADGE_CLASS[badge.favorable],
          )}
        >
          {Arrow ? (
            <Arrow aria-hidden className="h-3 w-3" />
          ) : (
            <Minus aria-hidden className="h-3 w-3" />
          )}
          {badge.display && <span>{badge.display}</span>}
        </span>
      </div>

      <Sparkline points={view.series} id={view.key} className="mt-1" />

      <p className="text-[11px] text-muted-foreground">{kpiCaption(view)}</p>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
