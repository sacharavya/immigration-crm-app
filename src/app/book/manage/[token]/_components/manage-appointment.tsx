"use client";

import {
  CalendarClock,
  CalendarX,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  Video,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import type { PublicSlot } from "../../../_components/types";
import { publicCancel, publicReschedule } from "../actions";

type Mode = "view" | "reschedule" | "cancel" | "done-reschedule" | "done-cancel";

type ManageAppointmentInput = {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_type: "online" | "onsite";
  online_link: string | null;
  onsite_address: string | null;
  appointment_type_id: string;
  type_name: string;
  duration_minutes: number;
};

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

function todayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function plusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatTimeLabel(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function ManageAppointment({
  token,
  appointment,
}: {
  token: string;
  appointment: ManageAppointmentInput;
}) {
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Local snapshot so the page can render the new time after reschedule
  // without a hard refresh.
  const [currentStarts, setCurrentStarts] = useState(appointment.starts_at);
  const [currentEnds, setCurrentEnds] = useState(appointment.ends_at);

  function handleReschedule(slot: PublicSlot) {
    setError(null);
    startTransition(async () => {
      const r = await publicReschedule({
        token,
        new_starts_at: slot.start_utc,
      });
      if ("error" in r) {
        setError(translateError(r.error));
        return;
      }
      setCurrentStarts(slot.start_utc);
      setCurrentEnds(slot.end_utc);
      setMode("done-reschedule");
    });
  }

  function handleCancel(reason: string) {
    setError(null);
    startTransition(async () => {
      const r = await publicCancel({ token, reason });
      if ("error" in r) {
        setError(translateError(r.error));
        return;
      }
      setMode("done-cancel");
    });
  }

  if (mode === "done-cancel") {
    return (
      <div className="rounded-md border border-stone-200 bg-white px-6 py-12 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">
          Your appointment has been cancelled
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-stone-600">
          We&apos;ve emailed a confirmation. Need to rebook? Head back to the
          booking page anytime.
        </p>
        <a
          href="/book"
          className="mt-4 inline-block text-sm text-[var(--navy)] underline-offset-2 hover:underline"
        >
          Back to booking
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">
          Manage your appointment
        </h1>
        <p className="text-sm text-stone-600">
          Reschedule or cancel below. This link works once for 24 hours past
          your appointment time.
        </p>
      </header>

      <div className="space-y-2 rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-base font-semibold text-stone-900">
          {appointment.type_name}
        </div>
        <div className="text-sm text-stone-700">
          {formatDateTime(currentStarts, appointment.timezone)}
        </div>
        <div className="text-xs text-stone-500">
          {appointment.duration_minutes} minutes
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-stone-700">
          {appointment.location_type === "online" ? (
            <>
              <Video className="h-4 w-4 text-stone-500" />
              <span>Online</span>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 text-stone-500" />
              <span>{appointment.onsite_address ?? "Onsite"}</span>
            </>
          )}
        </div>

        {mode === "done-reschedule" && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Rescheduled — we&apos;ve sent a new confirmation email.
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      {mode === "view" || mode === "done-reschedule" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("reschedule");
            }}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("cancel");
            }}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
          >
            <CalendarX className="h-3.5 w-3.5" />
            Cancel appointment
          </button>
        </div>
      ) : mode === "reschedule" ? (
        <ReschedulePane
          appointment={appointment}
          pending={pending}
          onBack={() => setMode("view")}
          onPick={handleReschedule}
        />
      ) : mode === "cancel" ? (
        <CancelPane
          pending={pending}
          onBack={() => setMode("view")}
          onConfirm={handleCancel}
        />
      ) : null}

      <p className="text-[11px] text-stone-400">
        Current end time stored as {currentEnds.slice(0, 10)} — kept consistent
        with the appointment&apos;s original duration.
      </p>
    </div>
  );
}

function ReschedulePane({
  appointment,
  pending,
  onBack,
  onPick,
}: {
  appointment: ManageAppointmentInput;
  pending: boolean;
  onBack: () => void;
  onPick: (slot: PublicSlot) => void;
}) {
  const [date, setDate] = useState<string>(todayInTz(appointment.timezone));
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetch(
      `/api/public/slots?type_id=${encodeURIComponent(appointment.appointment_type_id)}&date=${encodeURIComponent(date)}`,
      { cache: "no-store" },
    )
      .then((res) => res.json() as Promise<{ slots?: PublicSlot[] }>)
      .then((body) => {
        if (!cancelled) setSlots(body.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load times. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, appointment.appointment_type_id]);

  const minDate = todayInTz(appointment.timezone);
  const maxDate = plusDays(minDate, 60);

  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <h2 className="text-sm font-semibold text-stone-700">Pick a new time</h2>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
          Date
        </label>
        <input
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1 h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center text-sm text-stone-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Finding available times…
        </div>
      ) : loadError ? (
        <p className="text-sm text-rose-700">{loadError}</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-stone-500">
          No available times on this date. Try another day.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {slots.map((s) => (
            <button
              key={s.start_utc}
              type="button"
              onClick={() => onPick(s)}
              disabled={pending}
              className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-[var(--navy)] hover:bg-[var(--navy)] hover:text-white disabled:opacity-50"
            >
              {formatTimeLabel(s.start_utc, appointment.timezone)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CancelPane({
  pending,
  onBack,
  onConfirm,
}: {
  pending: boolean;
  onBack: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3 rounded-md border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-stone-700">
        Tell us why (briefly)
      </h2>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        disabled={pending}
        placeholder="A short reason helps us follow up if useful."
        className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="inline-flex items-center rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onConfirm(reason.trim())}
          disabled={pending || !reason.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling…
            </>
          ) : (
            "Confirm cancel"
          )}
        </button>
      </div>
    </div>
  );
}

function translateError(code: string): string {
  switch (code) {
    case "invalid_input":
      return "Please check your input and try again.";
    case "invalid_token":
      return "This management link is no longer valid.";
    case "token_expired":
      return "This link has expired. Please email us to make changes.";
    case "not_active":
      return "This appointment is no longer active.";
    case "slot_taken":
      return "That time was just taken. Pick another slot.";
    case "invalid_type":
      return "This appointment type is no longer available.";
    default:
      return "Something went wrong. Please try again.";
  }
}
