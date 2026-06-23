"use client";

import {
  AlertTriangle,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Loader2,
  Pencil,
  RefreshCw,
  UserX,
} from "lucide-react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  acceptAppointmentPayment,
  cancelAppointment,
  markCompleted,
  markNoShow,
  rejectAppointmentPayment,
  rescheduleAppointment,
  retryCalendarSync,
  updateAppointmentNotes,
} from "../actions";

import { STATUS_LABEL, STATUS_TONE, type AppointmentRow } from "./types";

type Mode = "view" | "reschedule" | "cancel" | "notes" | "reject_payment";

const TORONTO_TZ = "America/Toronto";

function formatDateTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toLocalDateTimeInput(iso: string): string {
  // YYYY-MM-DDTHH:mm in firm tz for the <input type="datetime-local">
  const d = new Date(iso);
  const fmt = d.toLocaleString("en-CA", {
    timeZone: TORONTO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // en-CA returns "YYYY-MM-DD, HH:mm" — normalise to the input format.
  return fmt.replace(", ", "T").slice(0, 16);
}

function localInputToIso(local: string): string {
  // The datetime-local value is wall-clock in Toronto. We interpret it as
  // such by building a Date in UTC and then offsetting back through the
  // tz. Simpler: assume the browser is in the firm's tz (CRM staff). If
  // not, the offset is wrong but practical impact is minor for v1.
  return new Date(local).toISOString();
}

export function AppointmentDetailDialog({
  appointment,
  children,
}: {
  appointment: AppointmentRow;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setTimeout(() => {
      setMode("view");
      setError(null);
    }, 200);
  }

  function handleResult(
    promise: Promise<{ ok: true } | { error: string }>,
  ) {
    startTransition(async () => {
      const r = await promise;
      if ("error" in r) {
        setError(r.error);
        return;
      }
      close();
    });
  }

  const editable =
    appointment.status === "confirmed" && mode === "view";

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger
        className={
          children
            ? undefined
            : "inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-100"
        }
      >
        {children ?? "View"}
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {appointment.appointment_type?.name ?? "Appointment"}
          </DialogTitle>
          <DialogDescription>
            {formatDateTime(appointment.starts_at, appointment.timezone)}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <>
            {/* APPT-8: payment review surfaces above the rest of the dialog
                so accept/reject is the obvious action when staff opens an
                awaiting_review row. */}
            {appointment.status === "awaiting_review" && (
              <PaymentReviewSection
                appointment={appointment}
                pending={pending}
                onAccept={() =>
                  handleResult(acceptAppointmentPayment(appointment.id))
                }
                onReject={() => setMode("reject_payment")}
              />
            )}
            {appointment.status === "pending_payment" && (
              <PendingPaymentSection appointment={appointment} />
            )}
            <ViewMode appointment={appointment} />
          </>
        )}
        {mode === "reject_payment" && (
          <RejectPaymentMode
            pending={pending}
            onBack={() => setMode("view")}
            onSubmit={(reason) =>
              handleResult(
                rejectAppointmentPayment({ id: appointment.id, reason }),
              )
            }
          />
        )}
        {mode === "reschedule" && (
          <RescheduleMode
            appointment={appointment}
            pending={pending}
            onCancel={() => setMode("view")}
            onSubmit={(starts, ends, reason) =>
              handleResult(
                rescheduleAppointment({
                  id: appointment.id,
                  starts_at: starts,
                  ends_at: ends,
                  reason,
                }),
              )
            }
          />
        )}
        {mode === "cancel" && (
          <CancelMode
            pending={pending}
            onBack={() => setMode("view")}
            onSubmit={(reason) =>
              handleResult(
                cancelAppointment({ id: appointment.id, reason }),
              )
            }
          />
        )}
        {mode === "notes" && (
          <NotesMode
            appointment={appointment}
            pending={pending}
            onCancel={() => setMode("view")}
            onSubmit={(reason, staff_notes) =>
              handleResult(
                updateAppointmentNotes({
                  id: appointment.id,
                  reason,
                  staff_notes,
                }),
              )
            }
          />
        )}

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        {mode === "view" && (
          <DialogFooter className="flex-wrap gap-2">
            {editable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("reschedule")}
                  disabled={pending}
                >
                  <CalendarClock className="mr-1 h-3.5 w-3.5" />
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("notes")}
                  disabled={pending}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleResult(markCompleted(appointment.id))
                  }
                  disabled={pending}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Mark completed
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResult(markNoShow(appointment.id))}
                  disabled={pending}
                >
                  <UserX className="mr-1 h-3.5 w-3.5" />
                  Mark no-show
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setMode("cancel")}
                  disabled={pending}
                >
                  <CalendarX className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}
            {appointment.graph_sync_status === "failed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleResult(retryCalendarSync(appointment.id))
                }
                disabled={pending}
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Retry calendar sync
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ViewMode({ appointment }: { appointment: AppointmentRow }) {
  const { status, graph_sync_status, graph_sync_error } = appointment;
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
        {graph_sync_status === "synced" && (
          <span className="text-xs text-emerald-600">
            ✓ Synced to Outlook
          </span>
        )}
        {graph_sync_status === "failed" && (
          <span
            className="inline-flex items-center text-xs text-amber-600"
            title={graph_sync_error ?? "Calendar sync failed"}
          >
            <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Sync failed
          </span>
        )}
      </div>

      <DetailRow label="Client">
        {appointment.client ? (
          <Link
            href={`/dashboard/clients/${appointment.client.id}`}
            className="text-[var(--navy)] underline-offset-2 hover:underline"
          >
            {appointment.snapshot_client_name}
          </Link>
        ) : (
          appointment.snapshot_client_name
        )}
        <span className="ml-2 text-xs text-stone-500">
          {appointment.snapshot_client_email}
          {appointment.snapshot_client_phone
            ? ` · ${appointment.snapshot_client_phone}`
            : ""}
        </span>
      </DetailRow>

      {appointment.case && (
        <DetailRow label="Case">
          <Link
            href={`/dashboard/cases/${appointment.case.id}`}
            className="font-mono text-xs text-[var(--navy)] underline-offset-2 hover:underline"
          >
            {appointment.case.case_number}
          </Link>
        </DetailRow>
      )}

      <DetailRow label="Location">
        {appointment.location_type === "online" ? (
          <LocationOnline appointment={appointment} />
        ) : (
          (appointment.onsite_address ?? "Onsite")
        )}
      </DetailRow>

      <DetailRow label="Assigned">
        {appointment.assigned_staff
          ? `${appointment.assigned_staff.first_name} ${appointment.assigned_staff.last_name}`
          : "Unassigned"}
      </DetailRow>

      <DetailRow label="Reason">
        <span className="whitespace-pre-wrap">{appointment.reason}</span>
      </DetailRow>

      {appointment.staff_notes && (
        <DetailRow label="Staff notes">
          <span className="whitespace-pre-wrap text-stone-600">
            {appointment.staff_notes}
          </span>
        </DetailRow>
      )}

      {appointment.cancellation_reason && (
        <DetailRow label="Cancellation reason">
          {appointment.cancellation_reason}
        </DetailRow>
      )}

      {appointment.appointment_type?.preparation_notes && (
        <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            What to prepare for this appointment
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
            {appointment.appointment_type.preparation_notes}
          </p>
        </div>
      )}
    </div>
  );
}

function RescheduleMode({
  appointment,
  pending,
  onCancel,
  onSubmit,
}: {
  appointment: AppointmentRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (startsIso: string, endsIso: string, reason: string | null) => void;
}) {
  const durMs =
    new Date(appointment.ends_at).getTime() -
    new Date(appointment.starts_at).getTime();
  const [startsLocal, setStartsLocal] = useState(
    toLocalDateTimeInput(appointment.starts_at),
  );
  const [reason, setReason] = useState("");

  function submit() {
    const startsIso = localInputToIso(startsLocal);
    const endsIso = new Date(
      new Date(startsIso).getTime() + durMs,
    ).toISOString();
    onSubmit(startsIso, endsIso, reason.trim() || null);
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          New start time
        </Label>
        <Input
          type="datetime-local"
          value={startsLocal}
          onChange={(e) => setStartsLocal(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-stone-500">
          Duration stays {Math.round(durMs / 60000)} min.
        </p>
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Reason for reschedule (optional)
        </Label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Back
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Rescheduling…
            </>
          ) : (
            "Confirm reschedule"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function CancelMode({
  pending,
  onBack,
  onSubmit,
}: {
  pending: boolean;
  onBack: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        Cancellation reason
      </Label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="Required. Visible to staff; not emailed to the client."
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button
          variant="destructive"
          onClick={() => onSubmit(reason.trim())}
          disabled={pending || !reason.trim()}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Cancelling…
            </>
          ) : (
            "Confirm cancel"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function NotesMode({
  appointment,
  pending,
  onCancel,
  onSubmit,
}: {
  appointment: AppointmentRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (reason: string, staffNotes: string | null) => void;
}) {
  const [reason, setReason] = useState(appointment.reason);
  const [staffNotes, setStaffNotes] = useState(appointment.staff_notes ?? "");
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Reason
        </Label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Staff notes
        </Label>
        <textarea
          value={staffNotes}
          onChange={(e) => setStaffNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Back
        </Button>
        <Button
          onClick={() => onSubmit(reason.trim(), staffNotes.trim() || null)}
          disabled={pending || !reason.trim()}
        >
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
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="text-sm text-stone-800">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APPT-8 payment-review surfaces
// ---------------------------------------------------------------------------

function formatFeeCad(value: string | number | null): string {
  if (value === null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatUploadedAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

function PaymentReviewSection({
  appointment,
  pending,
  onAccept,
  onReject,
}: {
  appointment: AppointmentRow;
  pending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const ref = appointment.id.slice(0, 8);
  return (
    <div className="space-y-3 rounded-md border border-purple-200 bg-purple-50/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">
        Payment review
      </div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm text-stone-800">
        <dt className="text-stone-500">Fee</dt>
        <dd className="font-medium tabular-nums">
          {formatFeeCad(appointment.fee_cad_at_booking)}
        </dd>
        <dt className="text-stone-500">Uploaded</dt>
        <dd>{formatUploadedAgo(appointment.payment_uploaded_at)} by client</dd>
        <dt className="text-stone-500">Expected sender</dt>
        <dd className="break-all">{appointment.snapshot_client_email}</dd>
        <dt className="text-stone-500">Reference</dt>
        <dd className="font-mono text-xs">{ref}</dd>
      </dl>
      {appointment.payment_screenshot_url ? (
        <a
          href={appointment.payment_screenshot_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
        >
          Open screenshot →
        </a>
      ) : (
        <p className="text-[11px] text-stone-500">
          Screenshot URL not loaded — open this appointment from{" "}
          <code className="font-mono">/dashboard/appointments</code> to view it.
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          onClick={onAccept}
          disabled={pending}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          ✓ Accept payment
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          disabled={pending}
        >
          ✗ Reject payment
        </Button>
      </div>
    </div>
  );
}

function PendingPaymentSection({
  appointment,
}: {
  appointment: AppointmentRow;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <strong>Awaiting payment proof from client.</strong>
      <p className="mt-1 text-xs text-amber-800">
        Fee: {formatFeeCad(appointment.fee_cad_at_booking)} · Reference{" "}
        <code className="font-mono">{appointment.id.slice(0, 8)}</code>. The
        slot will be released automatically if not received by end of day.
      </p>
    </div>
  );
}

function RejectPaymentMode({
  pending,
  onBack,
  onSubmit,
}: {
  pending: boolean;
  onBack: () => void;
  onSubmit: (reason: string) => void;
}) {
  const COMMON_REASONS = [
    "Amount does not match",
    "Wrong recipient",
    "Cannot verify transfer",
    "Other",
  ];
  const [reason, setReason] = useState<string>(COMMON_REASONS[0]);
  const [otherText, setOtherText] = useState("");

  const effective = reason === "Other" ? otherText.trim() : reason;

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        Reason for rejection
      </Label>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={pending}
        className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
      >
        {COMMON_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {reason === "Other" && (
        <textarea
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          rows={3}
          disabled={pending}
          placeholder="Tell the client what went wrong."
          className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
        />
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={pending}>
          Back
        </Button>
        <Button
          variant="destructive"
          onClick={() => onSubmit(effective)}
          disabled={pending || !effective}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Rejecting…
            </>
          ) : (
            "Confirm rejection"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// APPT-7: prominent join button when a Teams meeting is attached, with
// the full URL shown in monospace below for copy-paste. Falls back to
// the manual online_link, and finally to a "no link set yet" message.
function LocationOnline({ appointment }: { appointment: AppointmentRow }) {
  if (appointment.teams_join_url) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Microsoft Teams meeting
        </div>
        <a
          href={appointment.teams_join_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-[var(--navy)] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-[var(--navy)]/90"
        >
          Join meeting →
        </a>
        <div className="break-all font-mono text-[11px] text-stone-500">
          {appointment.teams_join_url}
        </div>
      </div>
    );
  }
  if (appointment.online_link) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Online meeting
        </div>
        <a
          href={appointment.online_link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
        >
          Join link →
        </a>
        <div className="break-all font-mono text-[11px] text-stone-500">
          {appointment.online_link}
        </div>
      </div>
    );
  }
  return (
    <span className="text-stone-500">Online — no link set yet</span>
  );
}
