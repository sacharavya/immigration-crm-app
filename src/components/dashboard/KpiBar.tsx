import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import Link from "next/link";

import {
  changeBadge,
  formatKpiValue,
  kpiCaption,
  type Favorable,
} from "@/lib/dashboard/metrics";
import type { KpiKey, KpiView } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

import { Sparkline } from "./Sparkline";

// Quiet by default: a good or flat movement is coloured text, not a filled
// pill, so four numbers side by side don't read as four competing badges.
// Only a bad movement keeps a fill, which is the one case worth a glance.
const BADGE_CLASS: Record<Favorable, string> = {
  good: "text-[var(--success-text)]",
  bad: "bg-maple-50 text-maple-700",
  neutral: "text-[var(--subtle-foreground)]",
};

function Cell({ view }: { view: KpiView }) {
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

  return (
    <div className="flex h-full flex-col gap-2.5 px-5 py-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
          {view.label}
        </span>
        <span title={view.hint} className="inline-flex text-[var(--subtle-foreground)]">
          <Info aria-hidden className="h-3.5 w-3.5" />
          <span className="sr-only">{view.hint}</span>
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1">
          <span className="text-[30px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">
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
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
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

      <Sparkline points={view.series} id={view.key} height={24} />

      <p className="mt-auto text-[11px] text-[var(--subtle-foreground)]">
        {kpiCaption(view)}
      </p>
    </div>
  );
}

// Separate tiles floating on the sunken canvas rather than one fused panel:
// elevation does the separating, so no divider rules are needed and an
// underfull last row is simply a shorter row.
export function KpiBar({
  views,
  links,
}: {
  views: KpiView[];
  links?: Partial<Record<KpiKey, string>>;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1080px]:grid-cols-4">
      {views.map((view) => {
        const href = links?.[view.key];
        return href ? (
          <Link
            key={view.key}
            href={href}
            className="rounded-[var(--radius)] border border-border bg-card shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Cell view={view} />
          </Link>
        ) : (
          <div key={view.key} className="rounded-[var(--radius)] border border-border bg-card shadow-sm">
            <Cell view={view} />
          </div>
        );
      })}
    </section>
  );
}
