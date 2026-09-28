import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Info } from "lucide-react";
import Link from "next/link";

import type { AttentionItem } from "@/lib/dashboard/getAttention";
import { cn } from "@/lib/utils/index";

const TONE = {
  critical: { Icon: AlertTriangle, cls: "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]" },
  action: { Icon: CircleDot, cls: "bg-[var(--warning-subtle)] text-[var(--warning-text)]" },
  info: { Icon: Info, cls: "bg-[var(--navy-50)] text-[var(--navy-700)]" },
} as const;

/**
 * The first card after sign-in: what is waiting on this person, one line per
 * queue, biggest fires first. Empty is a real state and says so.
 */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Needs your attention</h2>
          <p className="text-xs text-muted-foreground">Everything waiting on you, most urgent first.</p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {items.reduce((n, i) => n + i.count, 0)}
          </span>
        )}
      </header>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-border px-5 py-6">
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          <div>
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">Nothing is waiting on you right now.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => {
            const { Icon, cls } = TONE[item.tone];
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", cls)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-foreground">
                    <span className="font-semibold tabular-nums">{item.count}</span>{" "}
                    {item.count === 1 ? item.noun[0] : item.noun[1]}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--subtle-foreground)] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
