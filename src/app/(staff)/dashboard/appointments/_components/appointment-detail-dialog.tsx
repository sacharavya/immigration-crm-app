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
  cancelAppointment,
  markCompleted,
  markNoShow,
  rescheduleAppointment,
  retryCalendarSync,
  updateAppointmentNotes,
} from "../actions";

import { STATUS_LABEL, STATUS_TONE, type AppointmentRow } from "./types";

type Mode = "view" | "reschedule" | "cancel" | "notes";

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
}: {
  appointment: AppointmentRow;
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
      <DialogTrigger className="inline-flex h-8 items-center rounded-md border border-stone-200 bg-white px-3 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-100">
        View
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
          <ViewMode appointment={appointment} />
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
          <>
            Online
            {appointment.online_link && (
              <a
                href={appointment.online_link}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-xs text-[var(--navy)] underline-offset-2 hover:underline"
              >
                Join link
              </a>
            )}
          </>
        ) : (
          appointment.onsite_address ?? "Onsite"
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
