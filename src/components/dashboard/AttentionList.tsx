import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Info } from "lucide-react";
import Link from "next/link";

import type { AttentionQueue } from "@/lib/dashboard/getAttention";
import { cn } from "@/lib/utils/index";

const TONE = {
  critical: { Icon: AlertTriangle, cls: "bg-[var(--destructive-subtle)] text-[var(--destructive-text)]" },
  action: { Icon: CircleDot, cls: "bg-[var(--warning-subtle)] text-[var(--warning-text)]" },
  info: { Icon: Info, cls: "bg-[var(--navy-50)] text-[var(--navy-700)]" },
} as const;

/**
 * The first card after sign-in: what is waiting on this person. Each queue
 * shows its count and the items that have waited longest, each a direct
 * link to the record; "View all" opens the queue. Empty is a real state.
 */
export function AttentionList({ queues }: { queues: AttentionQueue[] }) {
  const total = queues.reduce((n, q) => n + q.count, 0);
  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <header className="flex items-end justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Needs your attention</h2>
          <p className="text-xs text-muted-foreground">
            {total === 0 ? "Everything waiting on you shows up here." : `${total} ${total === 1 ? "item" : "items"} across ${queues.length} ${queues.length === 1 ? "queue" : "queues"}, most urgent first.`}
          </p>
        </div>
      </header>

      {queues.length === 0 ? (
        <div className="flex items-center gap-3 border-t border-border px-5 py-6">
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          <div>
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="text-xs text-muted-foreground">Nothing is waiting on you right now.</p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {queues.map((q) => {
            const { Icon, cls } = TONE[q.tone];
            const more = q.count - q.items.length;
            return (
              <div key={q.key} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full", cls)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <h3 className="min-w-0 flex-1 text-sm text-foreground">
                    <span className="font-semibold tabular-nums">{q.count}</span> {q.count === 1 ? q.noun[0] : q.noun[1]}
                  </h3>
                  <Link href={q.href} className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
                    View all ›
                  </Link>
                </div>
                {q.items.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-10">
                    {q.items.map((item, i) => (
                      <li key={`${q.key}-${i}`}>
                        <Link
                          href={item.href}
                          className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-foreground">{item.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                    {more > 0 && (
                      <li className="px-2 pt-0.5 text-xs text-[var(--subtle-foreground)]">and {more} more</li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
