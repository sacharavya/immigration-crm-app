import { Check } from "lucide-react";

import { phaseIndex, PHASES, type CaseStatus } from "@/lib/utils/phase";
import { cn } from "@/lib/utils/index";

import { CaseEventDialog } from "./case-event-dialog";
import { RecordEventDialog } from "./record-event-dialog";

// Token-styled horizontal stepper. Completed nodes use the navy accent wash
// with a check, the current node is filled primary, future nodes are muted.
// Connectors mirror the node state. Advance phase is the single filled
// primary action of this card; Record event sits beside it as a secondary.

const ADVANCE_TRIGGER_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-[var(--primary-hover)]";

export function CasePhaseTracker({
  status,
  caseId,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
}: {
  status: CaseStatus;
  caseId: string;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
}) {
  const current = phaseIndex(status);
  const isClosed = current === null;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <ol className="flex flex-1 items-center">
          {PHASES.map((phase, i) => {
            const n = phase.number;
            const isComplete = isClosed || (current !== null && n < current);
            const isCurrent = !isClosed && current === n;
            const connectorComplete =
              isClosed || (current !== null && n < current);

            return (
              <li key={n} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                      isComplete &&
                        "bg-[var(--navy-100)] text-[var(--navy-700)]",
                      isCurrent && "bg-primary text-primary-foreground",
                      !isComplete &&
                        !isCurrent &&
                        "border border-border text-[var(--subtle-foreground)]",
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      n
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isCurrent
                        ? "text-foreground"
                        : isComplete
                          ? "text-[var(--navy-700)]"
                          : "text-[var(--subtle-foreground)]",
                    )}
                  >
                    {phase.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-2 h-0.5 flex-1 self-start mt-3.5",
                      connectorComplete ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {!isClosed && (
          <div className="flex items-center gap-2">
            <CaseEventDialog caseId={caseId} currentStatus={status} />
            <RecordEventDialog
              caseId={caseId}
              currentStatus={status}
              quotedFeeCad={quotedFeeCad}
              retainerMinimumCad={retainerMinimumCad}
              collectedCad={collectedCad}
              triggerLabel="Advance phase"
              triggerClassName={ADVANCE_TRIGGER_CLASS}
            />
          </div>
        )}
      </div>
    </div>
  );
}
