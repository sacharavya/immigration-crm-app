import { formatDistanceToNowStrict } from "date-fns";
import { Briefcase, DollarSign, FolderOpen, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import type { AttentionQueue } from "@/lib/dashboard/getAttention";
import { changeBadge, formatKpiValue } from "@/lib/dashboard/metrics";
import type { KpiView, RecentRow } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";
import { STATUS_LABEL, type CaseStatus } from "@/lib/utils/phase";

import { Sparkline } from "./Sparkline";

// The reference's card grammar: white panel, 14 px corners, hairline border,
// a small title with an optional control on the right, generous padding.
export function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm", className)}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-[var(--navy)] hover:underline">
      {children}
    </Link>
  );
}

const TILE: Record<string, { Icon: typeof Briefcase; cls: string }> = {
  active_cases: { Icon: FolderOpen, cls: "bg-[var(--tile-mint)] text-[var(--tile-mint-fg)]" },
  clients: { Icon: Users, cls: "bg-[var(--tile-lilac)] text-[var(--tile-lilac-fg)]" },
  retained_mtd: { Icon: Briefcase, cls: "bg-[var(--tile-amber)] text-[var(--tile-amber-fg)]" },
  outstanding_fees: { Icon: DollarSign, cls: "bg-[var(--tile-peach)] text-[var(--tile-peach-fg)]" },
};

/** Icon tile · label · figure · change vs last month · sparkline. */
export function KpiCards({ views, overrides }: { views: KpiView[]; overrides?: Partial<Record<string, { label?: string; href?: string }>> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {views.map((v) => {
        const { Icon, cls } = TILE[v.key] ?? TILE.active_cases;
        const b = changeBadge({ current: v.current, previous: v.previous, higherIsBetter: v.higherIsBetter });
        const o = overrides?.[v.key];
        const body = (
          <div className="flex items-center gap-4">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", cls)}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted-foreground">{o?.label ?? v.label}</div>
              <div className="mt-0.5 text-[24px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">{formatKpiValue(v)}</div>
              <div className={cn("mt-1.5 text-[12px] leading-snug", b.favorable === "good" ? "text-[var(--success-text)]" : b.favorable === "bad" ? "text-[var(--destructive-text)]" : "text-muted-foreground")}>
                {b.display ? `${b.direction === "up" ? "↑" : "↓"} ${b.display} vs last month` : "no change vs last month"}
              </div>
            </div>
            <span className="h-9 w-[76px] shrink-0 text-[var(--navy)]">
              <Sparkline id={`kpi-${v.key}`} points={v.series} width={76} height={36} className="h-full w-full" />
            </span>
          </div>
        );
        const cls2 = "rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm";
        return o?.href ? (
          <Link key={v.key} href={o.href} className={cn(cls2, "transition-colors hover:bg-muted/30")}>{body}</Link>
        ) : (
          <div key={v.key} className={cls2}>{body}</div>
        );
      })}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  retainer_pending: "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
  documentation_in_progress: "bg-[var(--navy-50)] text-[var(--navy-700)]",
  documentation_review: "bg-[var(--navy-50)] text-[var(--navy-700)]",
  submitted_to_ircc: "bg-[var(--tile-amber)] text-[var(--tile-amber-fg)]",
  passport_requested: "bg-[var(--success-subtle)] text-[var(--success-text)]",
  refused: "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]",
};

/** The reference's transactions table: tinted header row, one line per case. */
export function RecentTable({ rows }: { rows: RecentRow[] }) {
  const statusLabel = (st: string) => STATUS_LABEL[st as CaseStatus] ?? st;
  return (
    <Panel title="Recent activity" className="p-0">
      <div className="-mt-4">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[var(--surface-sunken)] text-left text-[12px] text-muted-foreground">
              <th className="px-5 py-2.5 font-medium">Case</th>
              <th className="px-3 py-2.5 font-medium">Client</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">Service</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No active cases yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.caseId} className="transition-colors hover:bg-muted/40">
                <td className="px-5 py-3 font-mono text-[12px] text-muted-foreground"><Link href={`/dashboard/cases/${r.caseId}`}>{r.caseNumber}</Link></td>
                <td className="px-3 py-3 font-medium text-foreground"><Link href={`/dashboard/cases/${r.caseId}`}>{r.clientName}</Link></td>
                <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">{r.serviceName ?? "—"}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-md px-2 py-0.5 text-[12px] font-medium", STATUS_TONE[r.status] ?? "bg-muted text-muted-foreground")}>{statusLabel(r.status)}</span>
                </td>
                <td className="px-5 py-3 text-right text-muted-foreground">{formatDistanceToNowStrict(new Date(r.updatedAt), { addSuffix: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-border px-5 py-3 text-center">
        <PanelLink href="/dashboard/cases">View all cases →</PanelLink>
      </div>
    </Panel>
  );
}

/** The closing banner: one sentence on how things stand, and where to go. */
export function Callout({ queues }: { queues: AttentionQueue[] }) {
  const total = queues.reduce((n, q) => n + q.count, 0);
  const critical = queues.filter((q) => q.tone === "critical").reduce((n, q) => n + q.count, 0);
  return (
    <div className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--navy-100)] bg-[var(--navy-50)]/60 px-5 py-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--navy)] shadow-sm">
        <Sparkles className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-foreground">
          {total === 0 ? "You're all caught up." : critical > 0 ? `${critical} ${critical === 1 ? "item needs" : "items need"} you today.` : `${total} ${total === 1 ? "item is" : "items are"} waiting on you.`}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {total === 0 ? "Nothing is waiting on you — a good day to get ahead on the pipeline." : "Work through the attention list above; each line opens the record."}
        </p>
      </div>
      <PanelLink href={total === 0 ? "/dashboard/cases?view=board" : queues[0].href}>{total === 0 ? "Open the board" : "Start here"}</PanelLink>
    </div>
  );
}
