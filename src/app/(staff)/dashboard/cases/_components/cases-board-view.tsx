"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Menu } from "@base-ui/react/menu";
import { GripVertical, MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";

import {
  BallDot,
  DocsProgress,
  PaymentIndicator,
  PriorityPill,
  SIGNAL_EDGE,
  StatusLine,
  UrgencyLine,
  WorkerAvatar,
} from "@/components/cases/board-card-parts";
import type { BoardCardModel } from "@/lib/cases/board-card";
import { compareByPressing } from "@/lib/cases/board-card";
import { cn } from "@/lib/utils/index";
import {
  MILESTONE_STATUS,
  PHASE_LABELS,
  type Milestone,
} from "@/lib/utils/phase";

import { recordEvent } from "../[id]/actions";

const PHASES = [1, 2, 3, 4, 5] as const;

// Milestone recorded when a card moves FORWARD onto a phase column (source <
// target). Phase 1 has no "open the case" milestone, and Phase 5 outcomes
// (Approved / Refused) need an explicit decision via the case timeline.
const PHASE_FORWARD_MILESTONE: Partial<Record<number, Milestone>> = {
  2: "documents_in_progress",
  3: "review_started",
  4: "submitted_to_ircc",
};

// Resolve the milestone for a move from sourcePhase to targetPhase, or null
// when the transition needs an explicit decision on the case page. Drag and
// the keyboard Move menu both route through this so they stay in lock-step.
function resolveMove(sourcePhase: number, targetPhase: number): Milestone | null {
  if (targetPhase === sourcePhase) return null;
  if (targetPhase > sourcePhase) return PHASE_FORWARD_MILESTONE[targetPhase] ?? null;
  // Backward: only Review (3) → Documents (2) is a recordable revision.
  if (sourcePhase === 3 && targetPhase === 2) return "revision_requested";
  return null;
}

function groupByPhase(cards: BoardCardModel[]): Record<number, BoardCardModel[]> {
  const out: Record<number, BoardCardModel[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const c of cards) out[c.phase].push(c);
  for (const p of PHASES) out[p].sort(compareByPressing);
  return out;
}

export function CasesBoardView({ cases }: { cases: BoardCardModel[] }) {
  const router = useRouter();
  // Stable id namespace for dnd-kit's auto-generated aria ids so SSR and
  // client hydration agree.
  const dndId = useId();
  const [items, setItems] = useState(() => groupByPhase(cases));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const incoming = useMemo(() => groupByPhase(cases), [cases]);
  const itemsKey = useMemo(
    () => cases.map((c) => `${c.id}:${c.status}`).join("|"),
    [cases],
  );
  useMemoSync(itemsKey, () => setItems(incoming));

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Avoid stealing simple clicks (opening the case).
      activationConstraint: { distance: 5 },
    }),
    // Keyboard alternative to dragging: pick up with Space/Enter, move with
    // arrow keys, drop with Space/Enter.
    useSensor(KeyboardSensor),
  );

  function findPhaseOf(caseId: string): number | null {
    for (const phase of PHASES) {
      if (items[phase].some((c) => c.id === caseId)) return phase;
    }
    return null;
  }

  // Optimistically move a card between phases and persist via recordEvent.
  function moveCase(caseId: string, sourcePhase: number, targetPhase: number) {
    const milestone = resolveMove(sourcePhase, targetPhase);
    if (!milestone) {
      setError(
        targetPhase > sourcePhase
          ? "Phase 5 outcomes (Approved / Refused) need an explicit choice. Open the case to record a decision."
          : "That move is not supported here. Open the case and record an event to roll back.",
      );
      return;
    }
    const targetStatus = MILESTONE_STATUS[milestone];
    const previous = items;
    const card = items[sourcePhase].find((c) => c.id === caseId);
    if (!card) return;
    const moved: BoardCardModel = {
      ...card,
      status: targetStatus,
      phase: targetPhase as BoardCardModel["phase"],
    };
    setItems({
      ...items,
      [sourcePhase]: items[sourcePhase].filter((c) => c.id !== caseId),
      [targetPhase]: [moved, ...items[targetPhase]],
    });
    startTransition(async () => {
      const result = await recordEvent({ caseId, milestone });
      if ("error" in result) {
        setError(result.error);
        setItems(previous);
        return;
      }
      router.refresh();
    });
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
    const targetPhase = Number(String(over.id).replace("phase-", ""));
    if (!Number.isFinite(targetPhase)) return;
    const sourcePhase = findPhaseOf(caseId);
    if (sourcePhase === null || sourcePhase === targetPhase) return;
    moveCase(caseId, sourcePhase, targetPhase);
  }

  const activeCase = activeId
    ? Object.values(items).flat().find((c) => c.id === activeId)
    : null;

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive-subtle)] px-3 py-2 text-sm text-[color:var(--destructive-text)]"
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
        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-[color:var(--surface-sunken)] p-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PHASES.map((phase) => (
            <PhaseColumn
              key={phase}
              phase={phase}
              cases={items[phase]}
              droppable={Boolean(PHASE_FORWARD_MILESTONE[phase]) || phase === 2}
              onMove={moveCase}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCase ? <CaseCard card={activeCase} dragging /> : null}
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
  onMove,
}: {
  phase: number;
  cases: BoardCardModel[];
  droppable: boolean;
  onMove: (caseId: string, source: number, target: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `phase-${phase}`,
    disabled: !droppable,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${PHASE_LABELS[phase]} phase, ${cases.length} case${cases.length === 1 ? "" : "s"}`}
      className={cn(
        "flex min-h-[260px] flex-col rounded-2xl border border-border bg-card p-3 transition-all",
        isOver && droppable && "border-primary ring-2 ring-primary/15",
      )}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground tabular-nums">
            {phase}
          </span>
          <span className="text-xs font-semibold tracking-tight text-foreground">
            {PHASE_LABELS[phase]}
          </span>
        </div>
        <span className="text-xs font-medium tabular-nums text-[color:var(--subtle-foreground)]">
          {cases.length}
        </span>
      </header>

      <div className="flex flex-col gap-2">
        {cases.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-[color:var(--subtle-foreground)]">
            {phase === 5 ? "No decisions yet" : "No cases"}
          </p>
        ) : (
          cases.map((c) => <CaseCard key={c.id} card={c} onMove={onMove} />)
        )}
      </div>
    </section>
  );
}

function CaseCard({
  card,
  dragging = false,
  onMove,
}: {
  card: BoardCardModel;
  dragging?: boolean;
  onMove?: (caseId: string, source: number, target: number) => void;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  function open() {
    if (dragging) return;
    router.push(`/dashboard/cases/${card.id}`);
  }

  // Valid keyboard moves: target phases reachable from the current one.
  const moveTargets = PHASES.filter((p) => resolveMove(card.phase, p) !== null);

  return (
    <article
      ref={setNodeRef}
      style={style}
      suppressHydrationWarning
      className={cn(
        "group relative rounded-xl border border-border border-l-4 bg-card p-3 transition-all hover:border-[color:var(--border-secondary)]",
        SIGNAL_EDGE[card.signal],
        isDragging && !dragging && "opacity-30",
        dragging && "rotate-1 ring-2 ring-primary/20",
      )}
    >
      {/* Top line: ball-in-court dot, case number, service inline, then the
          priority pill and drag handle. */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <BallDot ball={card.ballInCourt} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {card.caseNumber}
          </span>
          {card.serviceName && (
            <span className="truncate text-[11px] text-muted-foreground">
              · {card.serviceName}
            </span>
          )}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1">
          {card.priority !== "none" && <PriorityPill priority={card.priority} />}
          {!dragging && (
            <button
              type="button"
              {...listeners}
              {...attributes}
              aria-label={`Drag to move case ${card.caseNumber} to another phase`}
              className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md text-[color:var(--subtle-foreground)] opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing group-hover:opacity-100"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Client name is the open control; its stretched ::after makes the whole
          card a single pointer click target while staying one keyboard stop.
          Interactive controls (drag handle, move menu) sit above it via z-10. */}
      <button
        type="button"
        onClick={open}
        aria-label={`Open case ${card.caseNumber} for ${card.clientName}`}
        className="mt-2 block w-full text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="line-clamp-1 text-sm font-semibold text-foreground">
          {card.clientName}
        </span>
      </button>

      {/* Service-missing line in place of the service. */}
      {!card.serviceName && (
        <p className="mt-0.5 text-xs font-medium text-[color:var(--warning-text)]">
          Service not set
        </p>
      )}

      <StatusLine ball={card.ballInCourt} text={card.statusText} className="mt-2" />

      {card.urgency && <UrgencyLine urgency={card.urgency} className="mt-1" />}

      {/* Metrics: documents progress + payment. */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <DocsProgress received={card.docsReceived} required={card.docsRequired} />
        <PaymentIndicator state={card.payment.state} label={card.payment.label} />
      </div>

      {/* Footer: worker + phase age, with the keyboard move menu. */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <WorkerAvatar name={card.workerName} withName />
        <div className="relative z-10 flex items-center gap-1">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {card.phaseAgeDays}d
          </span>
          {!dragging && onMove && moveTargets.length > 0 && (
            <PhaseMoveMenu
              currentPhase={card.phase}
              targets={moveTargets}
              onSelect={(target) => onMove(card.id, card.phase, target)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

// Keyboard-accessible alternative to dragging: a menu of valid target phases.
function PhaseMoveMenu({
  currentPhase,
  targets,
  onSelect,
}: {
  currentPhase: number;
  targets: ReadonlyArray<number>;
  onSelect: (target: number) => void;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Move case from ${PHASE_LABELS[currentPhase]} to another phase`}
        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:opacity-100"
      >
        <MoveRight className="h-3.5 w-3.5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={4} align="end" className="z-50">
          <Menu.Popup className="min-w-44 rounded-lg border border-border bg-popover p-1 text-popover-foreground outline-none">
            {targets.map((p) => (
              <Menu.Item
                key={p}
                onClick={() => onSelect(p)}
                className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none data-[highlighted]:bg-muted"
              >
                Move to {p}. {PHASE_LABELS[p]}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/* Runs `fn` whenever `key` changes, for one-off sync-with-prop logic. */
function useMemoSync(key: string, fn: () => void) {
  useEffect(() => {
    fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
