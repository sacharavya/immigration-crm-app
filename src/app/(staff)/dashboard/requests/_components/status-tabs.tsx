import Link from "next/link";

import { cn } from "@/lib/utils/index";

export type RequestStatus = "pending" | "opened" | "dismissed";

const TABS: ReadonlyArray<{ key: RequestStatus; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "opened", label: "Opened" },
  { key: "dismissed", label: "Dismissed" },
];

// Server-rendered status filter. Each tab is a link that sets ?status=, so the
// active filter persists in the URL and the page stays a server component.
export function RequestStatusTabs({
  active,
  counts,
}: {
  active: RequestStatus;
  counts: Record<RequestStatus, number>;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {TABS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={key === "pending" ? "/dashboard/requests" : `/dashboard/requests?status=${key}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {counts[key]}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
