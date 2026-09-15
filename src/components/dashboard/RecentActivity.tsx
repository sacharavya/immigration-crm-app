import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import type { RecentRow } from "@/lib/dashboard/types";
import { STATUS_LABEL, type CaseStatus } from "@/lib/utils/phase";
import { cn } from "@/lib/utils/index";

// Status pill families, all from BBI tokens. Anything not listed maps to the
// nearest family in the lookup below.
const STATUS_PILL: Record<CaseStatus, string> = {
  retainer_pending: "bg-muted text-muted-foreground",
  documentation_in_progress: "bg-accent text-primary",
  documentation_review: "bg-accent text-primary",
  submitted_to_ircc: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
  passport_requested: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  refused: "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]",
  closed: "bg-muted text-muted-foreground",
};

function statusLabel(status: string): string {
  return STATUS_LABEL[status as CaseStatus] ?? status;
}

function statusPill(status: string): string {
  return STATUS_PILL[status as CaseStatus] ?? "bg-muted text-muted-foreground";
}

export function RecentActivity({ rows }: { rows: RecentRow[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recently updated
          </h2>
          <p className="text-xs text-muted-foreground">
            Most recent activity across active cases.
          </p>
        </div>
        <Link
          href="/dashboard/cases"
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No active cases yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={row.caseId}>
                <Link
                  href={`/dashboard/cases/${row.caseId}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--subtle-foreground)]">
                    {row.caseNumber}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {row.clientName}
                    {row.serviceName && (
                      <span className="ml-2 font-normal text-xs text-muted-foreground">
                        {row.serviceName}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                      statusPill(row.status),
                    )}
                  >
                    {statusLabel(row.status)}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
                    {formatDistanceToNowStrict(new Date(row.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
