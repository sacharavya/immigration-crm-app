"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";

import { Badge } from "@/components/ui/badge";
import { assigneeColor } from "@/lib/utils/assignee-color";
import { cn } from "@/lib/utils/index";
import {
  MILESTONE_STATUS,
  PHASE_LABELS,
  WAITING_ON,
  WAITING_LABEL,
  phaseIndex,
  type CaseStatus,
  type Milestone,
  type WaitingParty,
} from "@/lib/utils/phase";

import { recordEvent } from "../[id]/actions";

const WAITING_DOT: Record<WaitingParty, string> = {
  client: "bg-blue-500",
  ircc: "bg-amber-500",
  us: "bg-rose-500",
  none: "bg-stone-300",
};

export type BoardCase = {
  id: string;
  caseNumber: string;
  clientName: string;
  serviceName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  status: CaseStatus;
  // Retainer signal: when status is still 'retainer_pending' but the
  // retainer has been signed, the pill should reflect what's actually
  // pending (payment) instead of "Retainer Pending".
  retainerSigned: boolean;
  retainerSatisfied: boolean;
};

const statusPill: Record<CaseStatus, { label: string; className: string }> = {
  retainer_pending: { label: "Retainer Pending", className: "bg-gray-200 text-gray-700" },
  documentation_in_progress: {
    label: "Documentation",
    className: "bg-blue-100 text-blue-800",
  },
  documentation_review: {
    label: "Review",
    className: "bg-blue-100 text-blue-800",
  },
  submitted_to_ircc: {
    label: "Submitted",
    className: "bg-amber-100 text-amber-800",
  },
  biometrics_pending: {
    label: "Biometrics pending",
    className: "bg-teal-100 text-teal-800",
  },
  biometrics_completed: {
    label: "Biometrics done",
    className: "bg-teal-100 text-teal-800",
  },
  awaiting_decision: {
    label: "Awaiting decision",
    className: "bg-teal-100 text-teal-800",
  },
  passport_requested: {
    label: "Passport request",
    className: "bg-green-100 text-green-800",
  },
  refused: { label: "Refused", className: "bg-red-100 text-red-800" },
  additional_info_requested: {
    label: "More info",
    className: "bg-amber-100 text-amber-800",
  },
  closed: { label: "Closed", className: "bg-gray-200 text-gray-700" },
};

// Milestone recorded when a card is dropped onto a phase column,
// FORWARD only (source phase < target phase). Phase 1 / phase 6 are
// not drop targets — phase 1 has no "open the case" milestone, and
// phase 6 outcomes (passport / refused / more info) are decisions
// that need explicit choice via the timeline's record-event dialog.
const PHASE_FORWARD_DROP_MILESTONE: Partial<Record<number, Milestone>> = {
  2: "documents_in_progress",
  3: "review_started",
  4: "submitted_to_ircc",
  5: "biometrics_pending",
};

// Backward drops require both the source and target phases to know
// which "send back" milestone to fire. Today only Review (3) → Docs
// (2) is supported; phase 4+ rollbacks need explicit decisions and
// stay manual via the record-event dialog.
function pickBackwardDropMilestone(
  sourcePhase: number,
  targetPhase: number,
): Milestone | null {
  if (sourcePhase === 3 && targetPhase === 2) return "revision_requested";
  return null;
}

const PHASES = [1, 2, 3, 4, 5, 6] as const;

function groupByPhase(cases: BoardCase[]): Record<number, BoardCase[]> {
  const out: Record<number, BoardCase[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const c of cases) {
    const p = phaseIndex(c.status);
    if (p >= 1 && p <= 6) out[p].push(c);
  }
  return out;
}

export function CasesBoardView({ cases }: { cases: BoardCase[] }) {
  const router = useRouter();
  // Stable id namespace for dnd-kit's auto-generated aria-describedby
  // values. Without this, dnd-kit's module-scoped counter produces
  // different IDs on SSR vs client hydration and React rejects the
  // hydration with "tree hydrated but some attributes didn't match".
  const dndId = useId();
  const [items, setItems] = useState(() => groupByPhase(cases));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-derive items when the server-rendered cases prop changes (after
  // revalidatePath fires from the action).
  const incoming = useMemo(() => groupByPhase(cases), [cases]);
  const itemsKey = useMemo(
    () => cases.map((c) => `${c.id}:${c.status}`).join("|"),
    [cases],
  );
  // When the server data changes, reset local state to the canonical
  // truth. Keyed effect avoids the lint-resolves-the-equality nightmare.
  useMemoSync(itemsKey, () => setItems(incoming));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Avoid stealing simple clicks (e.g. on a case-number link).
      activationConstraint: { distance: 5 },
    }),
  );

  function findPhaseOf(caseId: string): number | null {
    for (const phase of PHASES) {
      if (items[phase].some((c) => c.id === caseId)) return phase;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setError(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const caseId = String(active.id);
    const overId = String(over.id);
    const targetPhase = Number(overId.replace("phase-", ""));
    if (!Number.isFinite(targetPhase)) return;

    const sourcePhase = findPhaseOf(caseId);
    if (sourcePhase === null || sourcePhase === targetPhase) return;

    const milestone =
      targetPhase > sourcePhase
        ? PHASE_FORWARD_DROP_MILESTONE[targetPhase] ?? null
        : pickBackwardDropMilestone(sourcePhase, targetPhase);
    if (!milestone) {
      setError(
        targetPhase > sourcePhase
          ? "Phase 6 outcomes (passport / refused / more info) need an explicit choice — open the case to record a decision event."
          : "Backward drop not supported for this transition. Open the case and record an event to roll back.",
      );
      return;
    }
    const targetStatus = MILESTONE_STATUS[milestone];

    // Optimistic move
    const previous = items;
    const card = items[sourcePhase].find((c) => c.id === caseId);
    if (!card) return;
    setItems({
      ...items,
      [sourcePhase]: items[sourcePhase].filter((c) => c.id !== caseId),
      [targetPhase]: [{ ...card, status: targetStatus }, ...items[targetPhase]],
    });

    startTransition(async () => {
      const result = await recordEvent({ caseId, milestone });
      if ("error" in result) {
        setError(result.error);
        setItems(previous); // rollback
        return;
      }
      router.refresh();
    });
  }

  const activeCase = activeId
    ? Object.values(items)
        .flat()
        .find((c) => c.id === activeId)
    : null;

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <DndContext
        id={dndId}
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {PHASES.map((phase) => (
            <PhaseColumn
              key={phase}
              phase={phase}
              cases={items[phase]}
              droppable={
                Boolean(PHASE_FORWARD_DROP_MILESTONE[phase]) || phase === 2
              }
            />
          ))}
        </div>
        <DragOverlay>
          {activeCase ? <CaseCard caseRow={activeCase} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ─────────────────────────────────────────────────── */

function PhaseColumn({
  phase,
  cases,
  droppable,
}: {
  phase: number;
  cases: BoardCase[];
  droppable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `phase-${phase}`,
    disabled: !droppable,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[260px] flex-col rounded-2xl border border-stone-200 bg-white/60 p-3 transition-all",
        isOver &&
          droppable &&
          "border-[var(--navy)] bg-blue-50/50 shadow-md ring-2 ring-[var(--navy)]/10",
        !droppable && "bg-stone-100/40",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--navy)] text-[10px] font-semibold text-white">
            {phase}
          </span>
          <span className="text-xs font-semibold tracking-tight text-stone-700">
            {PHASE_LABELS[phase]}
          </span>
        </div>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-stone-600">
          {cases.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {cases.length === 0 ? (
          <div
            className={cn(
              "rounded-lg border border-dashed py-6 text-center text-[11px]",
              droppable
                ? "border-stone-300 text-stone-400"
                : "border-stone-200 text-stone-300",
            )}
          >
            {droppable ? "Drop here" : "—"}
          </div>
        ) : (
          cases.map((c) => <CaseCard key={c.id} caseRow={c} />)
        )}
      </div>
    </div>
  );
}

function CaseCard({
  caseRow,
  dragging = false,
}: {
  caseRow: BoardCase;
  dragging?: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: caseRow.id });

  // Mirror the case detail page: while status is still retainer_pending
  // but the retainer is signed, show what's actually pending instead.
  const pill =
    caseRow.status === "retainer_pending" && caseRow.retainerSigned
      ? {
          label: caseRow.retainerSatisfied
            ? "Retainer Signed"
            : "Awaiting Payment",
          className: "bg-emerald-100 text-emerald-800",
        }
      : statusPill[caseRow.status];

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  // PointerSensor below has activationConstraint.distance = 5px, so a
  // pure click never starts a drag — onClick navigates without
  // interfering with drag.
  function handleClick() {
    if (dragging) return;
    router.push(`/dashboard/cases/${caseRow.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      // dnd-kit injects aria-describedby="DndDescribedBy-N" with an N
      // that's tracked by a module-scoped counter; SSR and client end
      // up with different values, which React would otherwise refuse
      // to hydrate. The DndContext id prop above stabilises most of
      // them; this is the belt-and-suspenders for any leftover drift.
      suppressHydrationWarning
      onClick={handleClick}
      role="button"
      aria-label={`Open ${caseRow.caseNumber} ${caseRow.clientName}`}
      className={cn(
        "group cursor-grab rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md active:cursor-grabbing",
        isDragging && !dragging && "opacity-30",
        dragging &&
          "rotate-1 cursor-grabbing border-[var(--navy)]/40 shadow-2xl ring-2 ring-[var(--navy)]/20",
      )}
    >
      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-stone-400">
        <span
          aria-label={WAITING_LABEL[WAITING_ON[caseRow.status]]}
          title={WAITING_LABEL[WAITING_ON[caseRow.status]]}
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            WAITING_DOT[WAITING_ON[caseRow.status]],
          )}
        />
        {caseRow.caseNumber}
      </div>
      <div className="mt-1">
        <Badge
          className={cn(
            pill.className,
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
          )}
        >
          {pill.label}
        </Badge>
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-medium leading-tight text-stone-900">
        {caseRow.clientName}
      </div>
      <div className="mt-0.5 line-clamp-1 text-xs text-stone-500">
        {caseRow.serviceName}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        {caseRow.assigneeName ? (
          (() => {
            const c = assigneeColor(caseRow.assigneeId);
            return (
              <span
                className={`inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${c.bg} ${c.fg} ${c.ring}`}
              >
                {caseRow.assigneeName}
              </span>
            );
          })()
        ) : (
          <span className="text-[10px] text-stone-400">Unassigned</span>
        )}
      </div>
    </div>
  );
}

/* Tiny effect-like helper that runs `fn` whenever `key` changes. Avoids
   useEffect's deps-array gymnastics for one-off sync-with-prop logic. */
function useMemoSync(key: string, fn: () => void) {
  useEffect(() => {
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
