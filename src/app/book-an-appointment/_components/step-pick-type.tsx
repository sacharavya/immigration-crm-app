"use client";

import { ArrowRight, Clock, FolderOpen, Info } from "lucide-react";

import type { PublicBookingType } from "./types";

// Step 1: full-width type rows per the design reference. Gold icon tile,
// title (+ Existing clients pill for case reviews), meta line, description,
// Interac notice for paid types, price + Select on the right.

function locationLabel(t: PublicBookingType): string {
  return t.default_location_type === "online"
    ? "Online meeting"
    : "Online or in person";
}

export function StepPickType({
  types,
  firmTimezone,
  onSelect,
}: {
  types: PublicBookingType[];
  firmTimezone: string;
  onSelect: (t: PublicBookingType) => void;
}) {
  return (
    <div className="space-y-4">
      {types.map((t) => {
        const paid = (t.fee_cad ?? 0) > 0;
        const Icon = t.code === "case_review" ? FolderOpen : Clock;
        return (
          <div
            key={t.id}
            className="flex flex-col gap-5 rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:flex-row sm:items-start sm:p-7"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4F7EF] text-[#62D4A6]">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[21px] font-bold tracking-[-.01em]">
                  {t.name}
                </h2>
                {t.code === "case_review" && (
                  <span className="rounded-full bg-[#F4EBFC] px-2.5 py-0.5 text-xs font-semibold text-[#8A4FD3]">
                    Existing clients
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-[#5A6A85]">
                {t.duration_minutes} minutes
                <span className="mx-2 text-[#B9BDD2]">·</span>
                {locationLabel(t)}
              </div>
              {t.description && (
                <p className="mt-2.5 text-[15px] leading-relaxed text-[#1E2136]/90">
                  {t.description}
                </p>
              )}
              {paid && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#FBEBD9] px-3.5 py-2 text-sm font-medium text-[#9A5B12]">
                  <Info className="h-4 w-4 shrink-0" strokeWidth={2} />
                  Payment via Interac e-Transfer required to confirm booking.
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-end sm:gap-3">
              <div
                className={
                  paid
                    ? "text-[26px] font-extrabold tracking-[-.02em] text-[#1E2136]"
                    : "text-[26px] font-extrabold tracking-[-.02em] text-[#1F7A3E]"
                }
              >
                {paid ? `$${t.fee_cad} CAD` : "Free"}
              </div>
              <button
                type="button"
                onClick={() => onSelect(t)}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#1E2136] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#2E3252]"
              >
                Select <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2.5 rounded-xl bg-[#F0F1F6] px-4 py-3.5 text-sm text-[#1E2136]">
        <Clock className="h-4 w-4 shrink-0 text-[#1E2136]" strokeWidth={2} />
        All appointments are in {firmTimezone}{" "}time. You&apos;ll receive a
        confirmation email with a meeting link or office directions.
      </div>
    </div>
  );
}
