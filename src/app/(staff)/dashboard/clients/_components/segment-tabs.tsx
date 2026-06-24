"use client";

import Link from "next/link";

import type { SegmentCounts } from "@/lib/clients/worklist";

import { buildHref, type WorklistParams } from "./build-href";

const TABS = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "active", label: "Active" },
  { key: "leads", label: "Leads" },
  { key: "past", label: "Past" },
] as const;

export function SegmentTabs({
  counts,
  params,
}: {
  counts: SegmentCounts;
  params: WorklistParams;
}) {
  const active = params.segment ?? "all";

  return (
    <div className="flex flex-wrap gap-1 border-b border-stone-200 pb-2">
      {TABS.map(({ key, label }) => {
        const count =
          key === "all"
            ? counts.all
            : key === "attention"
              ? counts.needs_attention
              : key === "active"
                ? counts.active
                : key === "leads"
                  ? counts.leads
                  : counts.past;
        const isActive = active === key;
        const isAttention = key === "attention" && count > 0;

        return (
          <Link
            key={key}
            href={buildHref(params, {
              segment: key === "all" ? null : key,
            })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--navy)] text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {label}
            <span
              className={`inline-flex min-w-[20px] items-center justify-center px-1 text-[11px] tabular-nums ${
                isActive
                  ? "text-white/80"
                  : isAttention
                    ? "font-semibold text-[var(--destructive)]"
                    : "text-stone-400"
              }`}
            >
              {count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
