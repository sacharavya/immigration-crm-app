import { CheckSquare } from "lucide-react";
import Link from "next/link";

import type { DashboardTask } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

type DueTone = "overdue" | "today" | "soon" | "later" | "none";

function dueLabel(t: DashboardTask): { label: string; tone: DueTone } {
  const iso = t.dueAt ?? (t.dueDate ? `${t.dueDate}T00:00:00Z` : null);
  if (!iso) return { label: "No due date", tone: "none" };

  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayDiff = Math.floor(
    (due.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (dayDiff < 0) {
    return { label: `Overdue ${Math.abs(dayDiff)}d`, tone: "overdue" };
  }
  if (dayDiff === 0) return { label: "Due today", tone: "today" };
  if (dayDiff === 1) return { label: "Due tomorrow", tone: "soon" };
  if (dayDiff <= 7) return { label: `In ${dayDiff}d`, tone: "soon" };
  return {
    label: due.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    tone: "later",
  };
}

const DUE_TONE: Record<DueTone, string> = {
  overdue: "font-semibold text-maple-700",
  today: "font-semibold text-[var(--warning-text)]",
  soon: "text-[var(--warning-text)]",
  later: "text-muted-foreground",
  none: "text-[var(--subtle-foreground)]",
};

function dotClass(t: DashboardTask): string {
  if (t.priority === "high" || t.priority === "urgent") return "bg-maple-600";
  if (t.status === "blocked") return "bg-warning";
  return "bg-[var(--border-secondary)]";
}

export function MyTasks({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2">
          <CheckSquare aria-hidden className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            My tasks
          </h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </header>

      {tasks.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Nothing on your plate
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasks assigned to you will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((t) => {
            const due = dueLabel(t);
            return (
              <li key={t.id}>
                <Link
                  href={t.caseId ? `/dashboard/cases/${t.caseId}` : "/dashboard/tasks"}
                  className="block px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        dotClass(t),
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                        {t.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        {t.caseNumber && (
                          <span className="font-mono uppercase tracking-wider text-[var(--subtle-foreground)]">
                            {t.caseNumber}
                          </span>
                        )}
                        <span className={cn("tabular-nums", DUE_TONE[due.tone])}>
                          {due.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="border-t border-border px-4 py-2.5 text-right">
        <Link
          href="/dashboard/tasks"
          className="text-xs font-medium text-primary hover:underline"
        >
          All tasks
        </Link>
      </footer>
    </div>
  );
}
