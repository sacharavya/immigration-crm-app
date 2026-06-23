"use client";

import { Loader2, Mail, Paperclip } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";

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
import { Input } from "@/components/ui/input";
import type { Database } from "@/lib/supabase/types";

import {
  recordCaseEvent,
  type RecordCaseEventInput,
} from "../actions";

type CaseStatus = Database["crm"]["Enums"]["case_status"];
type EventKind = RecordCaseEventInput["event_type"];

// Which statuses each event kind is valid from. Mirrors the server's
// EVENT_ALLOWED_FROM so the picker hides impossible options.
const ALLOWED_FROM: Record<EventKind, ReadonlyArray<CaseStatus>> = {
  biometrics_requested: ["submitted_to_ircc"],
  biometrics_scheduled: ["submitted_to_ircc"],
  biometrics_completed: ["submitted_to_ircc"],
  additional_info_requested: ["submitted_to_ircc"],
  additional_info_submitted: ["submitted_to_ircc"],
  interview_scheduled: ["submitted_to_ircc"],
  interview_completed: ["submitted_to_ircc"],
  application_returned: ["submitted_to_ircc"],
  additional_documents_requested: ["submitted_to_ircc"],
  appeal_filed: ["refused", "submitted_to_ircc"],
  withdrawal_requested: [
    "retainer_pending",
    "documentation_in_progress",
    "documentation_review",
    "submitted_to_ircc",
    "refused",
  ],
};

const EVENT_GROUPS: Array<{
  title: string;
  options: Array<{ kind: EventKind; label: string; description: string }>;
}> = [
  {
    title: "IRCC interactions",
    options: [
      {
        kind: "biometrics_requested",
        label: "Biometrics requested",
        description: "IRCC asked for biometrics on this case.",
      },
      {
        kind: "biometrics_scheduled",
        label: "Biometrics scheduled",
        description: "Client has booked an appointment.",
      },
      {
        kind: "biometrics_completed",
        label: "Biometrics completed",
        description: "Fingerprints + photo given.",
      },
      {
        kind: "additional_info_requested",
        label: "Additional information requested",
        description: "IRCC needs more from the firm.",
      },
      {
        kind: "additional_info_submitted",
        label: "Additional information submitted",
        description: "We responded to IRCC's request.",
      },
      {
        kind: "interview_scheduled",
        label: "Interview scheduled",
        description: "IRCC asked the client in for interview.",
      },
      {
        kind: "interview_completed",
        label: "Interview completed",
        description: "Interview happened.",
      },
      {
        kind: "application_returned",
        label: "Application returned",
        description: "IRCC kicked the application back.",
      },
      {
        kind: "additional_documents_requested",
        label: "Additional documents requested",
        description:
          "IRCC asked for new documents — reopens the upload workflow.",
      },
    ],
  },
  {
    title: "Case resolution",
    options: [
      {
        kind: "appeal_filed",
        label: "Appeal filed",
        description: "Client appealed a refusal.",
      },
      {
        kind: "withdrawal_requested",
        label: "Withdrawal requested",
        description: "Client wants to withdraw the application.",
      },
    ],
  },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayPlusYears(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

type CaseDocOption = { id: string; displayName: string };

export function CaseEventDialog({
  caseId,
  currentStatus,
  caseDocuments = [],
}: {
  caseId: string;
  currentStatus: CaseStatus;
  caseDocuments?: CaseDocOption[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<EventKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Email notification state (shared across all event forms)
  const [notifyClient, setNotifyClient] = useState(false);
  const [clientNote, setClientNote] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentDocId, setAttachmentDocId] = useState("");
  const [attachMode, setAttachMode] = useState<"upload" | "existing">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleGroups = useMemo(() => {
    return EVENT_GROUPS.map((g) => ({
      ...g,
      options: g.options.filter((o) =>
        ALLOWED_FROM[o.kind].includes(currentStatus),
      ),
    })).filter((g) => g.options.length > 0);
  }, [currentStatus]);

  const hasAny = visibleGroups.length > 0;

  function reset() {
    setPicked(null);
    setError(null);
    setNotifyClient(false);
    setClientNote("");
    setAttachmentFile(null);
    setAttachmentDocId("");
    setAttachMode("upload");
  }
  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  function submit(payload: RecordCaseEventInput) {
    setError(null);
    startTransition(async () => {
      let attachmentFormData: FormData | undefined;
      if (notifyClient && attachMode === "upload" && attachmentFile) {
        attachmentFormData = new FormData();
        attachmentFormData.append("file", attachmentFile);
      }

      const result = await recordCaseEvent(caseId, payload, {
        notifyClient,
        clientNote: clientNote.trim() || undefined,
        attachmentDocId:
          notifyClient && attachMode === "existing" && attachmentDocId
            ? attachmentDocId
            : undefined,
        attachmentFormData,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger
        disabled={!hasAny}
        className="inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        + Record event
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        {picked === null ? (
          <PickView groups={visibleGroups} onPick={setPicked} />
        ) : (
          <>
            <EventForm
              kind={picked}
              pending={pending}
              error={error}
              onBack={reset}
              onSubmit={submit}
            />
            {/* Email notification section (rendered below the form's DialogFooter) */}
            {picked !== null && (
              <div className="border-t border-stone-100 px-1 pt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifyClient}
                    onChange={(e) => setNotifyClient(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 accent-[var(--navy)]"
                  />
                  <Mail className="h-3.5 w-3.5 text-stone-400" />
                  <span className="font-medium text-stone-700">
                    Notify client by email
                  </span>
                </label>

                {notifyClient && (
                  <div className="mt-3 space-y-3 rounded-md border border-stone-100 bg-stone-50/50 p-3">
                    <label className="block text-sm">
                      <span className="block text-xs font-medium text-stone-600">
                        Personal note to client (optional)
                      </span>
                      <textarea
                        rows={2}
                        value={clientNote}
                        onChange={(e) => setClientNote(e.target.value)}
                        placeholder="Additional context for the client..."
                        className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
                      />
                    </label>

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
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) =>
                              setAttachmentFile(e.target.files?.[0] ?? null)
                            }
                            className="block w-full text-sm text-stone-600 file:mr-2 file:rounded-md file:border file:border-stone-200 file:bg-white file:px-2 file:py-1 file:text-xs file:text-stone-600"
                          />
                          {attachmentFile && (
                            <p className="mt-1 text-xs text-stone-500">
                              {attachmentFile.name} (
                              {(attachmentFile.size / 1024).toFixed(0)} KB)
                            </p>
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
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PickView({
  groups,
  onPick,
}: {
  groups: Array<{
    title: string;
    options: Array<{ kind: EventKind; label: string; description: string }>;
  }>;
  onPick: (k: EventKind) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Record event</DialogTitle>
        <DialogDescription>
          Pick the real-world event that just happened. The action chip
          updates on the next render; the case&rsquo;s phase doesn&rsquo;t
          change — use &ldquo;Advance phase&rdquo; for that.
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.title}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
              {g.title}
            </div>
            <div className="space-y-1.5">
              {g.options.map((o) => (
                <button
                  key={o.kind}
                  onClick={() => onPick(o.kind)}
                  type="button"
                  className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-left transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  <div className="text-sm font-medium text-stone-900">
                    {o.label}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    {o.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// EventForm — renders fields specific to the picked event kind. Each branch
// returns its own typed payload via the onSubmit callback.
// ---------------------------------------------------------------------------

function EventForm({
  kind,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  kind: EventKind;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (p: RecordCaseEventInput) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{labelFor(kind)}</DialogTitle>
        <DialogDescription>{descriptionFor(kind)}</DialogDescription>
      </DialogHeader>
      {kind === "biometrics_requested" && (
        <BiometricsRequestedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "biometrics_scheduled" && (
        <BiometricsScheduledForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "biometrics_completed" && (
        <BiometricsCompletedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "additional_info_requested" && (
        <AdditionalInfoRequestedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "additional_info_submitted" && (
        <AdditionalInfoSubmittedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "interview_scheduled" && (
        <InterviewScheduledForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "interview_completed" && (
        <InterviewCompletedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "application_returned" && (
        <ApplicationReturnedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "appeal_filed" && (
        <AppealFiledForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "withdrawal_requested" && (
        <WithdrawalRequestedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
      {kind === "additional_documents_requested" && (
        <AdditionalDocumentsRequestedForm
          onCancel={onBack}
          pending={pending}
          error={error}
          onSubmit={onSubmit}
        />
      )}
    </>
  );
}

function labelFor(k: EventKind): string {
  for (const g of EVENT_GROUPS) {
    const found = g.options.find((o) => o.kind === k);
    if (found) return found.label;
  }
  return k;
}

function descriptionFor(k: EventKind): string {
  for (const g of EVENT_GROUPS) {
    const found = g.options.find((o) => o.kind === k);
    if (found) return found.description;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Individual event forms. Each is a tiny self-contained controlled-form so
// it owns its own state and submits a strongly-typed payload.
// ---------------------------------------------------------------------------

type FormProps = {
  onCancel: () => void;
  pending: boolean;
  error: string | null;
  onSubmit: (p: RecordCaseEventInput) => void;
};

function Footer({
  onCancel,
  pending,
  error,
  disabled,
  onSubmit,
  submitLabel = "Record",
}: {
  onCancel: () => void;
  pending: boolean;
  error: string | null;
  disabled?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Back
        </Button>
        <Button onClick={onSubmit} disabled={pending || disabled}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Recording…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function FieldLabel({
  label,
  children,
  hint,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-xs font-medium text-stone-600">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-stone-500">{hint}</span>}
    </label>
  );
}

function BiometricsRequestedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        onSubmit={() =>
          onSubmit({
            event_type: "biometrics_requested",
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function BiometricsScheduledForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [date, setDate] = useState(todayIsoDate());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Scheduled date">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Location (optional)">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!date}
        onSubmit={() =>
          onSubmit({
            event_type: "biometrics_scheduled",
            scheduled_date: date,
            ...(location.trim() ? { location: location.trim() } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function BiometricsCompletedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [date, setDate] = useState(todayIsoDate());
  const [location, setLocation] = useState("");
  const [bvn, setBvn] = useState("");
  const [validUntil, setValidUntil] = useState(todayPlusYears(10));
  const [saveToClient, setSaveToClient] = useState(true);
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Completed date">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Location (optional)">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="BVN / reference number (optional)">
        <Input
          value={bvn}
          onChange={(e) => setBvn(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Valid until">
        <Input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={saveToClient}
          onChange={(e) => setSaveToClient(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Add to client&rsquo;s biometric history
          <span className="block text-[11px] text-stone-500">
            Saves this record on the client so future cases can reuse it.
          </span>
        </span>
      </label>
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!date}
        onSubmit={() =>
          onSubmit({
            event_type: "biometrics_completed",
            completed_date: date,
            ...(location.trim() ? { location: location.trim() } : {}),
            ...(bvn.trim() ? { bvn_or_reference: bvn.trim() } : {}),
            ...(validUntil ? { valid_until: validUntil } : {}),
            create_client_record: saveToClient,
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function AdditionalInfoRequestedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [what, setWhat] = useState("");
  const [dueDate, setDueDate] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="What did IRCC ask for?">
        <textarea
          rows={3}
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          placeholder="e.g., updated police clearance certificate"
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <FieldLabel label="Due date (optional)">
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!what.trim()}
        onSubmit={() =>
          onSubmit({
            event_type: "additional_info_requested",
            what_ircc_asked_for: what.trim(),
            ...(dueDate ? { due_date: dueDate } : {}),
          })
        }
      />
    </div>
  );
}

function AdditionalInfoSubmittedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [what, setWhat] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="What was sent?">
        <textarea
          rows={3}
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!what.trim()}
        onSubmit={() =>
          onSubmit({
            event_type: "additional_info_submitted",
            what_was_sent: what.trim(),
          })
        }
      />
    </div>
  );
}

function InterviewScheduledForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [dt, setDt] = useState(() => new Date().toISOString().slice(0, 16));
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Interview date + time">
        <Input
          type="datetime-local"
          value={dt}
          onChange={(e) => setDt(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Location (optional)">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!dt}
        onSubmit={() => {
          // datetime-local is local time; convert to ISO with offset.
          const iso = new Date(dt).toISOString();
          onSubmit({
            event_type: "interview_scheduled",
            interview_date: iso,
            ...(location.trim() ? { location: location.trim() } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          });
        }}
      />
    </div>
  );
}

function InterviewCompletedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [outcome, setOutcome] = useState<"" | "went_well" | "concerns" | "unsure">("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Outcome (optional)">
        <select
          value={outcome}
          onChange={(e) =>
            setOutcome(e.target.value as "" | "went_well" | "concerns" | "unsure")
          }
          className="mt-1 h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        >
          <option value="">—</option>
          <option value="went_well">Went well</option>
          <option value="concerns">Some concerns</option>
          <option value="unsure">Unsure / wait and see</option>
        </select>
      </FieldLabel>
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        onSubmit={() =>
          onSubmit({
            event_type: "interview_completed",
            ...(outcome ? { outcome } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function ApplicationReturnedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Reason given (optional)">
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        onSubmit={() =>
          onSubmit({
            event_type: "application_returned",
            ...(reason.trim() ? { reason_given: reason.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function AppealFiledForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Appeal reference (optional)">
        <Input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          className="mt-1"
        />
      </FieldLabel>
      <FieldLabel label="Notes (optional)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        onSubmit={() =>
          onSubmit({
            event_type: "appeal_filed",
            ...(ref.trim() ? { appeal_reference: ref.trim() } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function AdditionalDocumentsRequestedForm({
  onCancel,
  pending,
  error,
  onSubmit,
}: FormProps) {
  type Row = { label: string; due_date: string };
  const [rows, setRows] = useState<Row[]>([{ label: "", due_date: "" }]);
  const [overallDue, setOverallDue] = useState("");
  const [notes, setNotes] = useState("");

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { label: "", due_date: "" }]);
  }
  function removeRow(i: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  const validRows = rows.filter((r) => r.label.trim().length > 0);
  const canSubmit = validRows.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-xs font-medium text-stone-600">
          What documents did IRCC ask for?
        </div>
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 p-2"
            >
              <Input
                value={row.label}
                onChange={(e) => updateRow(i, { label: e.target.value })}
                placeholder="e.g., Updated police clearance"
                className="flex-1"
              />
              <Input
                type="date"
                value={row.due_date}
                onChange={(e) => updateRow(i, { due_date: e.target.value })}
                className="w-40"
                aria-label="Due date for this document"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow(i)}
                disabled={rows.length === 1}
                aria-label="Remove this document"
                className="text-stone-500"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="mt-2"
        >
          + Add another document
        </Button>
      </div>

      <FieldLabel
        label="Overall due date (optional)"
        hint="Applies to documents without a specific due date."
      >
        <Input
          type="date"
          value={overallDue}
          onChange={(e) => setOverallDue(e.target.value)}
          className="mt-1 w-48"
        />
      </FieldLabel>

      <FieldLabel
        label="Notes (optional)"
        hint="Any extra context from the IRCC letter."
      >
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        The case stays at Phase 4 (Submitted). The client upload link
        reactivates so the client can upload these documents directly.
      </p>

      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        disabled={!canSubmit}
        submitLabel="Record request"
        onSubmit={() =>
          onSubmit({
            event_type: "additional_documents_requested",
            documents: validRows.map((r) => ({
              label: r.label.trim(),
              ...(r.due_date ? { due_date: r.due_date } : {}),
            })),
            ...(overallDue ? { overall_due_date: overallDue } : {}),
            ...(notes.trim() ? { notes: notes.trim() } : {}),
          })
        }
      />
    </div>
  );
}

function WithdrawalRequestedForm({ onCancel, pending, error, onSubmit }: FormProps) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <FieldLabel label="Reason (optional)">
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
        />
      </FieldLabel>
      <Footer
        onCancel={onCancel}
        pending={pending}
        error={error}
        onSubmit={() =>
          onSubmit({
            event_type: "withdrawal_requested",
            ...(reason.trim() ? { reason: reason.trim() } : {}),
          })
        }
      />
    </div>
  );
}
