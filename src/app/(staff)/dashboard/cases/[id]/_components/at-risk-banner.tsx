import { Flag } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/index";

// Derived "at risk of missing a status deadline" banner. Server-rendered and
// purely presentational: the page computes the headline / reason / overdue
// state and passes the resolving action (the sub-status chip + action) as
// children, so the waiting state still appears exactly once. Warning normally,
// destructive once the filing deadline is overdue. Urgency is in the text, not
// colour alone.

export function AtRiskBanner({
  headline,
  reason,
  overdue,
  children,
}: {
  headline: string;
  reason: string;
  overdue: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-l-4 px-4 py-3",
        overdue
          ? "border-[var(--maple-50)] border-l-[var(--destructive)] bg-[var(--maple-50)] text-[var(--destructive-text)]"
          : "border-[var(--warning-subtle)] border-l-[var(--warning)] bg-[var(--warning-subtle)] text-[var(--warning-text)]",
      )}
    >
      <div className="flex items-start gap-3">
        <Flag aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{headline}</p>
          <p className="mt-0.5 text-sm">{reason}</p>
        </div>
      </div>
      {children && <div className="mt-3 pl-7">{children}</div>}
    </div>
  );
}
