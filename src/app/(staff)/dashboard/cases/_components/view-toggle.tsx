"use client";

import { LayoutGrid, List as ListIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type CasesView = "list" | "board";

const TABS: ReadonlyArray<{
  key: CasesView;
  label: string;
  Icon: typeof ListIcon;
}> = [
  { key: "board", label: "Board", Icon: LayoutGrid },
  { key: "list", label: "List", Icon: ListIcon },
];

export function ViewToggle({ activeView }: { activeView: CasesView }) {
  const params = useSearchParams();

  // Preserve the active filters across the view switch - only the `view`
  // param changes. Board is the default, so it carries no `view` param.
  function hrefFor(key: CasesView): string {
    const next = new URLSearchParams(params.toString());
    if (key === "board") next.delete("view");
    else next.set("view", "list");
    const qs = next.toString();
    return qs ? `/dashboard/cases?${qs}` : "/dashboard/cases";
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {TABS.map(({ key, label, Icon }) => {
        const active = key === activeView;
        return (
          <Link
            key={key}
            href={hrefFor(key)}
            aria-current={active ? "page" : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            ].join(" ")}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
