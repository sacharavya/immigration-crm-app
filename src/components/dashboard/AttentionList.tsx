import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { AttentionQueue } from "@/lib/dashboard/getAttention";
import { cn } from "@/lib/utils/index";

const TONE = {
  critical: { cls: "bg-[var(--destructive)]" },
  action: { cls: "bg-[var(--warning)]" },
  info: { cls: "bg-[var(--navy)]" },
} as const;

/**
 * The first card after sign-in: what is waiting on this person. Each queue
 * shows its count and the items that have waited longest, each a direct
 * link to the record; "View all" opens the queue. Empty is a real state.
 */
export function AttentionList({ queues }: { queues: AttentionQueue[] }) {
  const total = queues.reduce((n, q) => n + q.count, 0);
  return (
    <section className="flex flex-col rounded-[var(--radius)] border border-border bg-card p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium text-foreground">Needs your attention</h2>
        <span className="text-[12px] text-muted-foreground">{total === 0 ? "" : `${total} ${total === 1 ? "item" : "items"}`}</span>
      </header>

      {queues.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-6 w-6 text-[var(--success)]" />
          <p className="text-[13px] text-muted-foreground">You&apos;re all caught up</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queues.map((q) => {
            const { cls } = TONE[q.tone];
            const more = q.count - q.items.length;
            return (
              <div key={q.key}>
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", cls)} />
                  <h3 className="min-w-0 flex-1 text-[13px] text-foreground">
                    <span className="font-semibold tabular-nums">{q.count}</span> {q.count === 1 ? q.noun[0] : q.noun[1]}
                  </h3>
                  <Link href={q.href} className="shrink-0 text-[12px] text-muted-foreground transition-colors hover:text-foreground">
                    View all ›
                  </Link>
                </div>
                {q.items.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 pl-[18px]">
                    {q.items.map((item, i) => (
                      <li key={`${q.key}-${i}`}>
                        <Link href={item.href} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-foreground">{item.title}</span>
                            <span className="block truncate text-[12px] text-muted-foreground">{item.meta}</span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--subtle-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                    {more > 0 && <li className="px-2 pt-0.5 text-[12px] text-[var(--subtle-foreground)]">and {more} more</li>}
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
