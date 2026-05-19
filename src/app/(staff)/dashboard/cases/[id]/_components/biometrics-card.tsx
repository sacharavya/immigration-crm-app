"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/types";

import {
  linkBiometricRecord,
  updateCaseBiometricsStatus,
} from "../actions";

type BiometricsStatus = Database["crm"]["Enums"]["biometrics_status"];

export type ClientBiometricRecord = {
  id: string;
  date_given: string;
  location: string | null;
  bvn_or_reference: string | null;
  application_context: string | null;
  valid_until: string | null;
};

type Props = {
  caseId: string;
  status: BiometricsStatus;
  linkedRecord: ClientBiometricRecord | null;
  priorRecords: ClientBiometricRecord[];
  canEdit: boolean;
  // Most-recent biometrics-related event for the case (so we can show
  // "Requested on May 14, 2026" / "Scheduled for …" beneath the status pill).
  latestBiometricsEvent: {
    type: string;
    occurredAt: string;
    eventData: Record<string, unknown> | null;
  } | null;
};

const STATUS_PRESENTATION: Record<
  BiometricsStatus,
  { label: string; dot: string; chip: string }
> = {
  not_applicable: {
    label: "Not required for this application",
    dot: "bg-stone-400",
    chip: "bg-stone-100 text-stone-700",
  },
  previously_given_valid: {
    label: "Previously given (still valid)",
    dot: "bg-green-500",
    chip: "bg-green-100 text-green-800",
  },
  previously_given_expired: {
    label: "Previously given but expired",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
  },
  pending: {
    label: "Pending — awaiting IRCC instruction",
    dot: "bg-stone-400",
    chip: "bg-stone-100 text-stone-700",
  },
  requested_by_ircc: {
    label: "Requested by IRCC",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-blue-500",
    chip: "bg-blue-100 text-blue-800",
  },
  completed: {
    label: "Completed",
    dot: "bg-green-500",
    chip: "bg-green-100 text-green-800",
  },
  exempt: {
    label: "Exempt by IRCC",
    dot: "bg-stone-400",
    chip: "bg-stone-100 text-stone-700",
  },
};

const STATUS_OPTIONS: BiometricsStatus[] = [
  "not_applicable",
  "pending",
  "requested_by_ircc",
  "scheduled",
  "completed",
  "previously_given_valid",
  "previously_given_expired",
  "exempt",
];

export function BiometricsCard({
  caseId,
  status,
  linkedRecord,
  priorRecords,
  canEdit,
  latestBiometricsEvent,
}: Props) {
  const presentation = STATUS_PRESENTATION[status];
  const detail = buildStatusDetail(status, linkedRecord, latestBiometricsEvent);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Biometrics
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          aria-hidden
          className={`h-2 w-2 shrink-0 rounded-full ${presentation.dot}`}
        />
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${presentation.chip}`}
        >
          {presentation.label}
        </span>
      </div>
      {detail && (
        <p className="mt-1.5 text-xs text-stone-600">{detail}</p>
      )}

      {canEdit && (
        <div className="mt-3 flex flex-wrap gap-2">
          <EditStatusDialog caseId={caseId} current={status} />
          {priorRecords.length > 0 && (
            <UsePriorBiometricsDialog
              caseId={caseId}
              records={priorRecords}
            />
          )}
        </div>
      )}
    </div>
  );
}

function buildStatusDetail(
  status: BiometricsStatus,
  linked: ClientBiometricRecord | null,
  latestEvent: Props["latestBiometricsEvent"],
): string | null {
  if (status === "previously_given_valid" && linked) {
    return `Given ${format(new Date(linked.date_given), "MMM d, yyyy")}${
      linked.valid_until
        ? ` · valid until ${format(new Date(linked.valid_until), "MMM d, yyyy")}`
        : ""
    }`;
  }
  if (status === "previously_given_expired" && linked) {
    return `Given ${format(new Date(linked.date_given), "MMM d, yyyy")}${
      linked.valid_until
        ? ` · expired ${format(new Date(linked.valid_until), "MMM d, yyyy")}`
        : ""
    }`;
  }
  if (status === "requested_by_ircc" && latestEvent?.type === "biometrics_requested") {
    return `Requested on ${format(new Date(latestEvent.occurredAt), "MMM d, yyyy")}`;
  }
  if (status === "scheduled" && latestEvent?.type === "biometrics_scheduled") {
    const data = (latestEvent.eventData ?? {}) as Record<string, unknown>;
    const dateStr =
      typeof data.scheduled_date === "string"
        ? format(new Date(data.scheduled_date), "MMM d, yyyy")
        : null;
    const loc = typeof data.location === "string" ? data.location : null;
    if (dateStr && loc) return `Scheduled for ${dateStr} at ${loc}`;
    if (dateStr) return `Scheduled for ${dateStr}`;
    return null;
  }
  if (status === "completed" && latestEvent?.type === "biometrics_completed") {
    const data = (latestEvent.eventData ?? {}) as Record<string, unknown>;
    const dateStr =
      typeof data.completed_date === "string"
        ? format(new Date(data.completed_date), "MMM d, yyyy")
        : null;
    return dateStr ? `Completed on ${dateStr}` : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Edit-status dialog: simple select that posts updateCaseBiometricsStatus.
// ---------------------------------------------------------------------------

function EditStatusDialog({
  caseId,
  current,
}: {
  caseId: string;
  current: BiometricsStatus;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<BiometricsStatus>(current);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateCaseBiometricsStatus(caseId, status);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Edit status
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit biometrics status</DialogTitle>
          <DialogDescription>
            Manually adjust the case&rsquo;s biometrics status. Use this for
            cases that didn&rsquo;t flow through a recorded IRCC event.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BiometricsStatus)}
            className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_PRESENTATION[s].label}
              </option>
            ))}
          </select>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || status === current}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Use-prior-biometrics dialog: pick a record from the client's history.
// ---------------------------------------------------------------------------

function UsePriorBiometricsDialog({
  caseId,
  records,
}: {
  caseId: string;
  records: ClientBiometricRecord[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      const result = await linkBiometricRecord(caseId, picked);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Use prior biometrics
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Use prior biometrics</DialogTitle>
          <DialogDescription>
            Pick a biometric record from the client&rsquo;s history. The case
            biometrics status flips to <em>previously given</em>.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {records.map((r) => {
            const expired =
              r.valid_until !== null &&
              new Date(r.valid_until) < new Date(new Date().toISOString().slice(0, 10));
            return (
              <label
                key={r.id}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  picked === r.id
                    ? "border-[var(--navy)] bg-blue-50"
                    : "border-stone-200 hover:bg-stone-50"
                }`}
              >
                <input
                  type="radio"
                  name="bio-record"
                  className="mt-0.5"
                  checked={picked === r.id}
                  onChange={() => setPicked(r.id)}
                />
                <span className="min-w-0 flex-1">
                  <div className="font-medium text-stone-900">
                    Given {format(new Date(r.date_given), "MMM d, yyyy")}
                    {expired && (
                      <span className="ml-1 text-xs text-amber-700">
                        (expired)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500">
                    {r.application_context ?? "—"}
                    {r.valid_until
                      ? ` · valid until ${format(new Date(r.valid_until), "MMM d, yyyy")}`
                      : ""}
                  </div>
                </span>
              </label>
            );
          })}
        </div>
        {error && (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !picked}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Linking…
              </>
            ) : (
              "Use this record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
