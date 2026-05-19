"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MILESTONE_LABEL,
  MILESTONE_NEEDS_CONFIRM,
  nextMilestones,
  type CaseStatus,
  type Milestone,
} from "@/lib/utils/phase";

import { recordEvent } from "../actions";

import { GateBlockedView } from "./gate-blocked-view";

type Stage =
  | { kind: "pick" }
  | { kind: "confirm"; milestone: Milestone }
  | { kind: "blocked"; reason: string };

type Props = {
  caseId: string;
  currentStatus: CaseStatus;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
  triggerLabel?: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordEventDialog({
  caseId,
  currentStatus,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
  triggerLabel = "+ Record event",
}: Props) {
  const milestones = nextMilestones(currentStatus);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [pending, startTransition] = useTransition();

  if (milestones.length === 0) return null;

  function close() {
    setOpen(false);
    // Reset internal state once the close animation has played out.
    setTimeout(() => setStage({ kind: "pick" }), 200);
  }

  function pick(milestone: Milestone) {
    setStage({ kind: "confirm", milestone });
  }

  function submit(milestone: Milestone, occurredAtIso: string, note: string) {
    startTransition(async () => {
      const result = await recordEvent({
        caseId,
        milestone,
        occurredAt: occurredAtIso,
        note: note.trim() || null,
      });
      if ("error" in result) {
        if (result.gateBlocked) {
          setStage({ kind: "blocked", reason: result.error });
          return;
        }
        // Surface as a generic alert in the confirm view; the user can
        // step back and try again.
        alert(result.error);
        return;
      }
      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger className="inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-100">
        {triggerLabel}
      </DialogTrigger>

      <DialogContent>
        {stage.kind === "blocked" ? (
          <GateBlockedView
            caseId={caseId}
            reason={stage.reason}
            quotedFeeCad={quotedFeeCad}
            retainerMinimumCad={retainerMinimumCad}
            collectedCad={collectedCad}
            onCancel={close}
          />
        ) : stage.kind === "confirm" ? (
          <ConfirmView
            milestone={stage.milestone}
            pending={pending}
            onBack={() => setStage({ kind: "pick" })}
            onSubmit={(occurred, note) => submit(stage.milestone, occurred, note)}
          />
        ) : (
          <PickView milestones={milestones} onPick={pick} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickView({
  milestones,
  onPick,
}: {
  milestones: Milestone[];
  onPick: (m: Milestone) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Record event</DialogTitle>
        <DialogDescription>
          Pick the real-world event that just happened. The case status updates
          to match.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        {milestones.map((m) => (
          <Button
            key={m}
            className={`w-full justify-start ${m === "decision_refused" ? "text-destructive" : ""}`}
            variant="outline"
            onClick={() => onPick(m)}
          >
            {MILESTONE_LABEL[m]}
          </Button>
        ))}
      </div>
    </>
  );
}

function ConfirmView({
  milestone,
  pending,
  onBack,
  onSubmit,
}: {
  milestone: Milestone;
  pending: boolean;
  onBack: () => void;
  onSubmit: (occurredAtIso: string, note: string) => void;
}) {
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const needsConfirm = MILESTONE_NEEDS_CONFIRM.has(milestone);
  const today = todayIsoDate();

  function handleSubmit() {
    if (needsConfirm && !confirmed) {
      setConfirmed(true);
      return;
    }
    // Convert YYYY-MM-DD to a UTC instant. We pin to noon UTC so the date
    // doesn't drift across the dateline when displayed locally.
    const occurred = new Date(`${date}T12:00:00Z`).toISOString();
    onSubmit(occurred, note);
  }

  if (needsConfirm && confirmed) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Confirm refusal</DialogTitle>
          <DialogDescription>
            Marking this case as <strong>Refused</strong> is a final outcome and
            cannot be undone from the UI. Are you sure?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmed(false)}
            disabled={pending}
          >
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Recording…
              </>
            ) : (
              "Confirm refusal"
            )}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{MILESTONE_LABEL[milestone]}</DialogTitle>
        <DialogDescription>
          Pick the date this happened. Defaults to today; backdate when
          recording an event after the fact.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-stone-600">
            Date
          </span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          />
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-stone-600">
            {milestone === "decision_refused"
              ? "Reason for refusal (optional)"
              : milestone === "decision_approved"
                ? "Note / passport request reference (optional)"
                : "Note (optional)"}
          </span>
          <textarea
            rows={milestone === "decision_refused" ? 4 : 2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              milestone === "decision_refused"
                ? "What did IRCC say? Captured on the case event."
                : "e.g. AOR# 1234, biometrics letter received"
            }
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          />
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={pending || !date}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Recording…
            </>
          ) : milestone === "decision_refused" ? (
            "Continue"
          ) : (
            "Record"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
