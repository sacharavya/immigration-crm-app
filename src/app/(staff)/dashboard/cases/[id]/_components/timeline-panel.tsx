"use client";

import { format } from "date-fns";

import { cn } from "@/lib/utils/index";
import {
  WAITING_LABEL,
  WAITING_ON,
  type CaseStatus,
  type WaitingParty,
} from "@/lib/utils/phase";

import { CaseEventDialog } from "./case-event-dialog";
import { RecordEventDialog } from "./record-event-dialog";

export type TimelineEvent = {
  id: string;
  occurredAt: string;
  description: string | null;
  recorderName: string | null;
  milestone: string | null;
};

type Props = {
  caseId: string;
  currentStatus: CaseStatus;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
};

const WAITING_PILL: Record<WaitingParty, string> = {
  client: "bg-blue-100 text-blue-800 ring-blue-200",
  ircc: "bg-amber-100 text-amber-800 ring-amber-200",
  us: "bg-rose-100 text-rose-800 ring-rose-200",
  none: "bg-stone-100 text-stone-600 ring-stone-200",
};

export function WaitingChip({ status }: { status: CaseStatus }) {
  const party = WAITING_ON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
        WAITING_PILL[party],
      )}
      title="Derived from current status"
    >
      {WAITING_LABEL[party]}
    </span>
  );
}

export function TimelineActions({
  caseId,
  currentStatus,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
}: Props) {
  return (
    <div className="ml-2 flex items-center gap-3">
      <WaitingChip status={currentStatus} />
      <CaseEventDialog caseId={caseId} currentStatus={currentStatus} />
      <RecordEventDialog
        caseId={caseId}
        currentStatus={currentStatus}
        quotedFeeCad={quotedFeeCad}
        retainerMinimumCad={retainerMinimumCad}
        collectedCad={collectedCad}
        triggerLabel="+ Advance phase"
      />
    </div>
  );
}

export function TimelineList({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-400">
        No events yet.
      </p>
    );
  }

  return (
    <ul className="relative space-y-3 border-l border-stone-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--navy)] ring-4 ring-white" />
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-mono text-stone-500 tabular-nums">
              {format(new Date(e.occurredAt), "MMM d, yyyy")}
            </span>
            <span className="text-sm font-medium text-stone-900">
              {e.description ?? "—"}
            </span>
            {e.recorderName && (
              <span className="text-xs text-stone-500">
                · {e.recorderName}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
