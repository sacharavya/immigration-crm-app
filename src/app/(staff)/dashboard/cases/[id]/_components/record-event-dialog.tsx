"use client";

import { Loader2, Mail, Paperclip } from "lucide-react";
import { useRef, useState, useTransition } from "react";

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

export type CaseDocOption = {
  id: string;
  displayName: string;
};

type Props = {
  caseId: string;
  currentStatus: CaseStatus;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
  triggerLabel?: string;
  /** Overrides the trigger styling. Defaults to a token-based outline. */
  triggerClassName?: string;
  /** Case documents available for attachment in emails. */
  caseDocuments?: CaseDocOption[];
};

const DEFAULT_TRIGGER_CLASS =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

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
  triggerClassName = DEFAULT_TRIGGER_CLASS,
  caseDocuments = [],
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

  function submit(
    milestone: Milestone,
    occurredAtIso: string,
    note: string,
    emailOpts?: EmailOpts,
  ) {
    startTransition(async () => {
      // Build FormData carrying every selected file attachment.
      let attachmentFormData: FormData | undefined;
      if (emailOpts?.notifyClient && emailOpts.attachmentFiles?.length) {
        attachmentFormData = new FormData();
        for (const f of emailOpts.attachmentFiles) {
          attachmentFormData.append("file", f);
        }
      }

      const result = await recordEvent({
        caseId,
        milestone,
        occurredAt: occurredAtIso,
        note: note.trim() || null,
        notifyClient: emailOpts?.notifyClient ?? false,
        clientNote: emailOpts?.clientNote?.trim() || null,
        attachmentDocId: emailOpts?.attachmentDocId || null,
        attachmentFormData,
        statusExpiry: emailOpts?.statusExpiry || null,
      });
      if ("error" in result) {
        if (result.gateBlocked) {
          setStage({ kind: "blocked", reason: result.error });
          return;
        }
        alert(result.error);
        return;
      }
      if (result.emailWarning) {
        alert(result.emailWarning);
      }
      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger className={triggerClassName}>
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
            caseDocuments={caseDocuments}
            onBack={() => setStage({ kind: "pick" })}
            onSubmit={(occurred, note, emailOpts) =>
              submit(stage.milestone, occurred, note, emailOpts)
            }
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

type EmailOpts = {
  notifyClient: boolean;
  clientNote?: string;
  attachmentFiles?: File[];
  attachmentDocId?: string;
  statusExpiry?: string; // YYYY-MM-DD, for approved decisions
};

function ConfirmView({
  milestone,
  pending,
  caseDocuments,
  onBack,
  onSubmit,
}: {
  milestone: Milestone;
  pending: boolean;
  caseDocuments: CaseDocOption[];
  onBack: () => void;
  onSubmit: (occurredAtIso: string, note: string, emailOpts?: EmailOpts) => void;
}) {
  const [date, setDate] = useState(todayIsoDate());
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const needsConfirm = MILESTONE_NEEDS_CONFIRM.has(milestone);
  const today = todayIsoDate();

  // Email notification state
  const [notifyClient, setNotifyClient] = useState(false);
  const [clientNote, setClientNote] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentDocId, setAttachmentDocId] = useState("");
  const [attachMode, setAttachMode] = useState<"upload" | "existing">("upload");
  const [statusExpiry, setStatusExpiry] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isDecision =
    milestone === "decision_approved" || milestone === "decision_refused";
  const isApproved = milestone === "decision_approved";

  function handleSubmit() {
    if (needsConfirm && !confirmed) {
      setConfirmed(true);
      return;
    }
    const occurred = new Date(`${date}T12:00:00Z`).toISOString();
    onSubmit(occurred, note, {
      notifyClient,
      clientNote: clientNote.trim() || undefined,
      attachmentFiles:
        attachMode === "upload" && attachmentFiles.length > 0
          ? attachmentFiles
          : undefined,
      attachmentDocId: attachMode === "existing" && attachmentDocId ? attachmentDocId : undefined,
      statusExpiry: isApproved && statusExpiry ? statusExpiry : undefined,
    });
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
                ? "Note / approval reference (optional)"
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

        {/* ── Status expiry (approval only) ─────────────────── */}
        {isApproved && (
          <label className="block text-sm">
            <span className="block text-xs font-medium text-stone-600">
              Immigration status expiry date
            </span>
            <p className="mt-0.5 text-[11px] text-stone-400">
              When does the approved permit or status expire? This updates the
              client&apos;s immigration status automatically.
            </p>
            <input
              type="date"
              value={statusExpiry}
              onChange={(e) => setStatusExpiry(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
            />
          </label>
        )}

        {/* ── Client email notification ────────────────────── */}
        <div className="border-t border-stone-100 pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyClient}
              onChange={(e) => setNotifyClient(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 accent-[var(--navy)]"
            />
            <Mail className="h-3.5 w-3.5 text-stone-400" />
            <span className="font-medium text-stone-700">
              {isDecision
                ? "Send decision notification to client"
                : "Notify client by email"}
            </span>
          </label>

          {notifyClient && (
            <div className="mt-3 space-y-3 rounded-md border border-stone-100 bg-stone-50/50 p-3">
              {/* Client note */}
              <label className="block text-sm">
                <span className="block text-xs font-medium text-stone-600">
                  Personal note to client (optional)
                </span>
                <textarea
                  rows={2}
                  value={clientNote}
                  onChange={(e) => setClientNote(e.target.value)}
                  placeholder={
                    isDecision
                      ? "Any personal message to include in the email..."
                      : "Additional context for the client..."
                  }
                  className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </label>

              {/* Attachment */}
              <div>
                <span className="block text-xs font-medium text-stone-600">
                  <Paperclip className="mr-1 inline h-3 w-3" />
                  Attach a file (optional)
                </span>

                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAttachMode("upload")}
                    className={`rounded-md border px-2.5 py-1 text-xs ${
                      attachMode === "upload"
                        ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                        : "border-stone-200 bg-white text-stone-600"
                    }`}
                  >
                    Upload new
                  </button>
                  {caseDocuments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAttachMode("existing")}
                      className={`rounded-md border px-2.5 py-1 text-xs ${
                        attachMode === "existing"
                          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                          : "border-stone-200 bg-white text-stone-600"
                      }`}
                    >
                      From case files
                    </button>
                  )}
                </div>

                {attachMode === "upload" && (
                  <div className="mt-2">
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) =>
                        setAttachmentFiles(Array.from(e.target.files ?? []))
                      }
                      className="block w-full text-sm text-stone-600 file:mr-2 file:rounded-md file:border file:border-stone-200 file:bg-white file:px-2 file:py-1 file:text-xs file:text-stone-600"
                    />
                    {attachmentFiles.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-stone-500">
                        {attachmentFiles.map((f, i) => (
                          <li key={`${f.name}-${i}`}>
                            {f.name} ({(f.size / 1024).toFixed(0)} KB)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {attachMode === "existing" && caseDocuments.length > 0 && (
                  <select
                    value={attachmentDocId}
                    onChange={(e) => setAttachmentDocId(e.target.value)}
                    className="mt-2 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
                  >
                    <option value="">Select a document...</option>
                    {caseDocuments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={pending || !date}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {notifyClient ? "Sending..." : "Recording..."}
            </>
          ) : milestone === "decision_refused" ? (
            "Continue"
          ) : notifyClient ? (
            "Record & send email"
          ) : (
            "Record"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
