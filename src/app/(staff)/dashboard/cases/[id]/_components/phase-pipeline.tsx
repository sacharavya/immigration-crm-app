import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { phaseIndex, PHASE_LABELS, type CaseStatus } from "@/lib/utils/phase";

// FLOW-2: 5-phase pipeline. Phase 5 splits visually into Approved /
// Refused based on the underlying status (passport_requested vs refused).
// Closed cases sit off-pipeline and render a compact closed pill instead.

const PHASE_NUMBERS = [1, 2, 3, 4, 5] as const;

export function PhasePipeline({
  status,
  children,
}: {
  status: CaseStatus;
  children?: ReactNode;
}) {
  const current = phaseIndex(status);

  if (current === null) {
    // Closed — all phases past, neutral display.
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Phase
          </div>
          <Badge className="rounded-full bg-gray-200 px-3 py-1 font-medium text-gray-700">
            Closed
          </Badge>
        </div>
        <ol className="flex items-center gap-2">
          {PHASE_NUMBERS.map((n) => (
            <li
              key={n}
              className="flex flex-1 flex-col items-center justify-center rounded-lg bg-stone-100 px-2 py-3 text-xs font-medium text-stone-600"
            >
              <span className="flex items-center gap-1">
                <span className="text-[11px] opacity-80">{n}</span>
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="mt-0.5 text-[11px]">{PHASE_LABELS[n]}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const isApproved = status === "passport_requested";
  const isRefused = status === "refused";

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
        Phase
      </div>
      <div className="flex items-center gap-2">
        <ol className="flex flex-1 items-center gap-2">
          {PHASE_NUMBERS.map((n) => {
            const isCurrent = n === current;
            const isComplete = n < current;
            const isFuture = n > current;

            // Phase 5 has two visual variants when current. Other phases
            // (or non-current phase 5) use the default navy/stone scheme.
            const phase5Current = isCurrent && n === 5;

            const classes = [
              "flex flex-1 flex-col items-center justify-center rounded-lg px-2 py-3 text-xs font-medium",
              phase5Current && isApproved && "bg-green-600 text-white",
              phase5Current && isRefused && "bg-red-600 text-white",
              isCurrent && !phase5Current && "bg-[var(--navy)] text-white",
              isComplete && "bg-stone-100 text-stone-600",
              isFuture && "border border-dashed border-stone-300 text-stone-400",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li key={n} className={classes}>
                <span className="flex items-center gap-1">
                  <span className="text-[11px] opacity-80">{n}</span>
                  {isComplete && <Check className="h-3 w-3" strokeWidth={3} />}
                  {phase5Current && isApproved && (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  )}
                  {phase5Current && isRefused && (
                    <X className="h-3 w-3" strokeWidth={3} />
                  )}
                </span>
                <span className="mt-0.5 text-[11px]">{PHASE_LABELS[n]}</span>
              </li>
            );
          })}
        </ol>

        {children}
      </div>
    </div>
  );
}
