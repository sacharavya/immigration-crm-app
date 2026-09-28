import { CalendarDays, CheckSquare } from "lucide-react";
import Link from "next/link";

import type { AppointmentRow } from "@/app/(staff)/dashboard/appointments/_components/types";
import type { DashboardTask, KpiView, PipelinePhase } from "@/lib/dashboard/types";
import { changeBadge, formatKpiValue } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils/index";


// The dashboard's card vocabulary, after Copilot: a white panel with a small
// title top-left and a muted "Somewhere ›" link top-right, no rules inside,
// content either a centred figure over a chart, two figures side by side,
// or rows of dot · label · bar · value.

export function Panel({
  title,
  link,
  children,
  className,
}: {
  title: string;
  link?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm", className)}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-foreground">{title}</h2>
        {link && (
          <Link href={link.href} className="text-[12px] text-muted-foreground transition-colors hover:text-foreground">
            {link.label} ›
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

function ChangePill({ view }: { view: KpiView }) {
  const b = changeBadge({ current: view.current, previous: view.previous, higherIsBetter: view.higherIsBetter });
  if (b.direction === "flat" || b.display === "") return null;
  const good = b.favorable === "good";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        good ? "bg-[var(--success-subtle)] text-[var(--success-text)]" : "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]",
      )}
    >
      {b.direction === "up" ? "↗" : "↘"} {b.display}
    </span>
  );
}

/**
 * One row of figures with hairlines between them — the numbers that frame
 * the day, without charts: what is open, what is waiting, who is on file,
 * what is owed.
 */
export function StatStrip({
  stats,
}: {
  stats: Array<{ label: string; value: string; sub?: string; view?: KpiView; href?: string }>;
}) {
  return (
    <section className="grid grid-cols-2 divide-border rounded-[var(--radius)] border border-border bg-card shadow-sm sm:grid-cols-4 sm:divide-x">
      {stats.map((st) => {
        const inner = (
          <>
            <div className="text-[12px] text-muted-foreground">{st.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[24px] font-semibold leading-none tabular-nums tracking-[-0.02em] text-foreground">{st.value}</span>
              {st.view && <ChangePill view={st.view} />}
            </div>
            {st.sub && <div className="mt-1 text-[12px] text-muted-foreground">{st.sub}</div>}
          </>
        );
        const cls = "block px-5 py-4";
        return st.href ? (
          <Link key={st.label} href={st.href} className={cn(cls, "transition-colors hover:bg-muted/40")}>{inner}</Link>
        ) : (
          <div key={st.label} className={cls}>{inner}</div>
        );
      })}
    </section>
  );
}

const DOT: Record<number, string> = { 1: "bg-navy-200", 2: "bg-navy-400", 3: "bg-navy-600", 4: "bg-warning", 5: "bg-gold" };

/** Rows of dot · phase · bar · value — Copilot's "Top categories". */
export function PipelineRows({ phases, href }: { phases: PipelinePhase[]; href: string }) {
  const total = phases.reduce((n, p) => n + p.count, 0);
  return (
    <Panel title="Pipeline" link={{ label: "Board", href }}>
      <ul className="space-y-3">
        {phases.map((p) => (
          <li key={p.phase} className="flex items-center gap-3 text-[13px]">
            <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", DOT[p.phase])} />
            <Link href={p.href} className="w-28 shrink-0 truncate text-foreground hover:underline">
              {p.label}
            </Link>
            <span className="w-8 shrink-0 text-right font-medium tabular-nums text-foreground">{p.count}</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span className={cn("absolute inset-y-0 left-0 rounded-full", DOT[p.phase])} style={{ width: total ? `${(p.count / total) * 100}%` : "0%" }} />
            </span>
            <span className={cn("w-16 shrink-0 text-right text-[12px] tabular-nums", p.onUs > 0 && !p.withIrcc ? "font-medium text-[var(--warning-text)]" : "text-muted-foreground")}>
              {p.withIrcc ? "with IRCC" : p.onUs > 0 ? `${p.onUs} on us` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

type Upcoming = { at: Date; kind: "appointment" | "task"; title: string; detail: string; href: string };

const FIRM_TZ = "America/Toronto";
const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: FIRM_TZ, month: "short", day: "numeric" });
const clock = (d: Date) => d.toLocaleTimeString("en-CA", { timeZone: FIRM_TZ, hour: "numeric", minute: "2-digit" });

/** Dated rows with a tag pill — Copilot's "Next two weeks". */
export function NextTwoWeeks({
  appointments,
  tasks,
}: {
  appointments: AppointmentRow[];
  tasks: DashboardTask[];
}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86_400_000);
  const rows: Upcoming[] = [
    ...appointments.map((a) => ({
      at: new Date(a.starts_at),
      kind: "appointment" as const,
      title: a.snapshot_client_name,
      detail: clock(new Date(a.starts_at)),
      href: "/dashboard/appointments",
    })),
    ...tasks
      .filter((t) => t.dueAt || t.dueDate)
      .map((t) => {
        const at = new Date(t.dueAt ?? `${t.dueDate}T12:00:00`);
        return { at, kind: "task" as const, title: t.title, detail: at < now ? "overdue" : t.caseNumber ?? "", href: t.caseId ? `/dashboard/cases/${t.caseId}` : "/dashboard/tasks" };
      }),
  ]
    .filter((r) => r.at <= horizon)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 8);

  return (
    <Panel title="Next two weeks" link={{ label: "Calendar", href: "/dashboard/appointments" }}>
      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, i) => {
            const today = day(r.at) === day(now);
            const Icon = r.kind === "appointment" ? CalendarDays : CheckSquare;
            return (
              <li key={i}>
                <Link href={r.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1 text-[13px] transition-colors hover:bg-muted/60">
                  <span className="w-14 shrink-0 text-[12px] text-muted-foreground">{today ? "Today" : day(r.at)}</span>
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--subtle-foreground)]" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{r.title}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.06em]",
                      r.kind === "appointment" ? "bg-[var(--navy-50)] text-[var(--navy-700)]" : "bg-[var(--warning-subtle)] text-[var(--warning-text)]",
                    )}
                  >
                    {r.kind}
                  </span>
                  <span className={cn("w-16 shrink-0 text-right text-[12px] tabular-nums", r.detail === "overdue" ? "font-medium text-[var(--destructive-text)]" : "text-muted-foreground")}>
                    {r.detail}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
