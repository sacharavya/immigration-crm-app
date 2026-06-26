import Link from "next/link";

import type { AttentionTier, NeedsAttentionRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

// Tier drives the dot color and the reason text color. Meaning is carried by
// the reason text, never color alone.
const DOT_CLASS: Record<AttentionTier, string> = {
  critical: "bg-maple-600",
  high: "bg-maple-600",
  action: "bg-primary",
  aging: "bg-warning",
};

const REASON_CLASS: Record<AttentionTier, string> = {
  critical: "text-maple-700",
  high: "text-maple-700",
  action: "text-primary",
  aging: "text-[var(--warning-text)]",
};

// Critical gets the solid navy primary action; the rest get the navy wash.
function actionClass(tier: AttentionTier): string {
  return tier === "critical"
    ? "bg-primary text-primary-foreground hover:bg-primary-hover"
    : "bg-accent text-primary hover:bg-[var(--navy-100)]";
}

export function NeedsAttention({ rows }: { rows: NeedsAttentionRow[] }) {
  return (
    <section className="rounded-lg border border-border border-l-[3px] border-l-maple-600 bg-card">
      <header className="flex items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Needs attention
          </h2>
          <p className="text-xs text-muted-foreground">
            Cases waiting on the firm, most urgent first.
          </p>
        </div>
        <Link
          href="/dashboard/cases?attention=firm"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          All clear, nothing needs the firm right now.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li
              key={row.caseId}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  DOT_CLASS[row.tier],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {row.clientName}
                </div>
                <div className={cn("truncate text-xs", REASON_CLASS[row.tier])}>
                  {row.reason}
                </div>
              </div>
              <Link
                href={row.href}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  actionClass(row.tier),
                )}
              >
                {row.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
