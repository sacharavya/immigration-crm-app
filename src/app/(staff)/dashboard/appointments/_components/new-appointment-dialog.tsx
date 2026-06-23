"use client";

import { CalendarPlus, DollarSign, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

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
import { cn } from "@/lib/utils/index";

import { createAppointment, getAvailableSlots } from "../actions";

import type {
  AppointmentTypeOption,
  CasePrefill,
  ClientPrefill,
  LocationType,
} from "./types";

type Props = {
  types: AppointmentTypeOption[];
  // Office address from settings; used as default for onsite location.
  officeAddress: string;
  // Prefills when launched from a case or client page.
  prefilledClient?: ClientPrefill;
  prefilledCase?: CasePrefill;
  // Open cases the client owns (when launched from a client page). Lets
  // staff link this appointment to one of them.
  availableCases?: CasePrefill[];
  triggerLabel?: string;
  triggerVariant?: "primary" | "outline";
};

type Slot = { start_utc: string; end_utc: string };
type DayOfSlots = { date: string; slots: Slot[] };

const TORONTO_TZ = "America/Toronto";

function todayInTz(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TORONTO_TZ });
}

function plusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatSlotLabel(slot: Slot): string {
  return new Date(slot.start_utc).toLocaleTimeString("en-CA", {
    timeZone: TORONTO_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function NewAppointmentDialog({
  types,
  officeAddress,
  prefilledClient,
  prefilledCase,
  availableCases,
  triggerLabel = "+ New appointment",
  triggerVariant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [typeId, setTypeId] = useState<string>(types[0]?.id ?? "");
  const [caseId, setCaseId] = useState<string | null>(
    prefilledCase?.id ?? null,
  );
  const [name, setName] = useState(prefilledClient?.name ?? "");
  const [email, setEmail] = useState(prefilledClient?.email ?? "");
  const [phone, setPhone] = useState(prefilledClient?.phone ?? "");
  const [date, setDate] = useState(todayInTz());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [locationType, setLocationType] = useState<LocationType>("online");
  const [onlineLink, setOnlineLink] = useState("");
  const [onsiteAddress, setOnsiteAddress] = useState(officeAddress);
  const [reason, setReason] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [caseFieldError, setCaseFieldError] = useState<string | null>(null);

  const [slotDays, setSlotDays] = useState<DayOfSlots[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedType = useMemo(
    () => types.find((t) => t.id === typeId) ?? null,
    [types, typeId],
  );

  const feeRaw = selectedType?.fee_cad == null ? null : Number(selectedType.fee_cad);
  const isPaid = feeRaw !== null && feeRaw > 0;

  // When the type changes, snap duration/location defaults.
  useEffect(() => {
    if (!selectedType) return;
    setLocationType(selectedType.default_location_type);
    setSelectedSlot(null);
  }, [selectedType]);

  // Load slots whenever (typeId, date) changes.
  useEffect(() => {
    if (!open || !typeId) return;
    let cancelled = false;
    const from = new Date(`${date}T00:00:00.000Z`).toISOString();
    const to = new Date(`${plusDays(date, 1)}T00:00:00.000Z`).toISOString();
    setLoadingSlots(true);
    getAvailableSlots(typeId, from, to)
      .then((res) => {
        if (cancelled) return;
        if ("error" in res) {
          setError(res.error);
          setSlotDays([]);
        } else {
          setSlotDays(res.days);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, typeId, date]);

  function close() {
    setOpen(false);
    setTimeout(() => {
      setError(null);
      // Reset transient form bits but keep prefills.
      setSelectedSlot(null);
      setReason("");
      setStaffNotes("");
    }, 200);
  }

  function submit() {
    if (!selectedSlot) {
      setError("Pick a time slot.");
      return;
    }
    if (!selectedType) {
      setError("Pick an appointment type.");
      return;
    }
    // Case-required validation: surface inline on the field instead of as
    // a banner. This is the APPT-7 fix — the previous "appointment type
    // requires a linked case" toast came from a missing field, not a
    // wrong submission.
    if (selectedType.requires_case && !caseId) {
      setCaseFieldError("Pick a case for this appointment.");
      setError(null);
      return;
    }
    if (locationType === "onsite" && !onsiteAddress.trim()) {
      setError("Onsite address required.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setError(null);
    setCaseFieldError(null);
    startTransition(async () => {
      const result = await createAppointment({
        appointment_type_id: selectedType.id,
        client_id: prefilledClient?.id ?? null,
        case_id: caseId,
        snapshot_client_name: name.trim(),
        snapshot_client_email: email.trim(),
        snapshot_client_phone: phone.trim() || null,
        starts_at: selectedSlot.start_utc,
        ends_at: selectedSlot.end_utc,
        timezone: TORONTO_TZ,
        location_type: locationType,
        online_link: locationType === "online" ? onlineLink.trim() || null : null,
        onsite_address:
          locationType === "onsite" ? onsiteAddress.trim() : null,
        assigned_staff_id: null,
        reason: reason.trim(),
        staff_notes: staffNotes.trim() || null,
        send_confirmation_email: sendEmail,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      close();
    });
  }

  const slotsForDate =
    slotDays.find((d) => d.date === date)?.slots ?? [];

  // Case field rendering decision tree:
  // - prefilledCase set (Schedule meeting from a case page): locked display.
  // - availableCases populated (from a client page): dropdown of open cases.
  // - availableCases is []: client has no open cases — surface that.
  // - availableCases undefined (standalone) + requires_case: surface that
  //   this type can't be booked without case context.
  // - requires_case false and no context: hide the field entirely.
  const requiresCase = selectedType?.requires_case ?? false;
  const showCaseField =
    !!prefilledCase ||
    (availableCases && availableCases.length > 0) ||
    requiresCase;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium shadow-sm transition-colors",
          triggerVariant === "primary"
            ? "bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90"
            : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-100",
        )}
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
          <DialogDescription>
            Pick a type, a time, and who you&apos;re meeting. Confirmation email
            will be queued (sending wires up in a later release).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Appointment type">
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
            >
              {types.map((t) => {
                const fee = t.fee_cad == null ? null : Number(t.fee_cad);
                const feeLabel = fee && fee > 0 ? ` · $${fee}` : "";
                return (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.duration_minutes} min{feeLabel}
                  </option>
                );
              })}
            </select>
          </Field>

          <Field label="Date">
            <Input
              type="date"
              value={date}
              min={todayInTz()}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          {isPaid && (
            <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <DollarSign className="h-4 w-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <span className="font-medium">
                  Paid consultation · ${feeRaw?.toFixed(2)} CAD
                </span>
                <p className="mt-0.5 text-xs text-amber-700">
                  Client will receive payment instructions by email. The slot is
                  held until payment is confirmed. Unconfirmed bookings are
                  released at midnight.
                </p>
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Available slots
            </Label>
            {loadingSlots ? (
              <div className="mt-2 flex h-12 items-center justify-center text-xs text-stone-400">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Loading slots…
              </div>
            ) : slotsForDate.length === 0 ? (
              <p className="mt-2 text-xs text-stone-500">
                No open slots on this date. Try another day.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {slotsForDate.map((s) => {
                  const isSelected =
                    selectedSlot?.start_utc === s.start_utc;
                  return (
                    <button
                      key={s.start_utc}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`rounded-md border px-3 py-1 text-xs font-medium ${
                        isSelected
                          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      {formatSlotLabel(s)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Field label="Client name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!!prefilledClient}
              placeholder="Jane Doe"
            />
          </Field>

          <Field label="Client email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!prefilledClient}
              placeholder="jane@example.com"
            />
          </Field>

          <Field label="Client phone (optional)">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!!prefilledClient}
            />
          </Field>

          {showCaseField && prefilledCase ? (
            <Field label="Case (linked)">
              <Input value={prefilledCase.case_number} disabled />
              <p className="mt-1 text-[11px] text-stone-500">
                Linked to this case.
              </p>
            </Field>
          ) : showCaseField && availableCases && availableCases.length > 0 ? (
            <Field
              label={requiresCase ? "Linked case (required)" : "Case (optional)"}
            >
              <select
                value={caseId ?? ""}
                onChange={(e) => {
                  setCaseId(e.target.value || null);
                  if (e.target.value) setCaseFieldError(null);
                }}
                className={`h-9 w-full rounded-md border bg-white px-3 text-sm ${
                  caseFieldError ? "border-rose-300" : "border-stone-200"
                }`}
              >
                <option value="">{requiresCase ? "— Pick a case —" : "— None —"}</option>
                {availableCases!.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number}
                  </option>
                ))}
              </select>
              {caseFieldError && (
                <p className="mt-1 text-[11px] text-rose-700">
                  {caseFieldError}
                </p>
              )}
            </Field>
          ) : showCaseField && availableCases && availableCases.length === 0 ? (
            // Client is in scope but has no open cases yet.
            <Field label="Linked case (required)">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This client has no open cases. Open a case first, then book
                this appointment type.
              </div>
            </Field>
          ) : showCaseField && requiresCase ? (
            // Standalone launch with no client/case context.
            <Field label="Linked case (required)">
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This appointment type requires a linked case. Open the case
                detail page and use Schedule meeting from there.
              </div>
              {caseFieldError && (
                <p className="mt-1 text-[11px] text-rose-700">
                  {caseFieldError}
                </p>
              )}
            </Field>
          ) : null}

          <Field label="Location">
            <div className="flex gap-2">
              {(["online", "onsite"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocationType(opt)}
                  className={`rounded-md border px-3 py-1.5 text-sm capitalize ${
                    locationType === opt
                      ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                      : "border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          {locationType === "online" ? (
            <Field label="Meeting link (optional)">
              <Input
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://teams.microsoft.com/..."
              />
            </Field>
          ) : (
            <Field label="Onsite address">
              <Input
                value={onsiteAddress}
                onChange={(e) => setOnsiteAddress(e.target.value)}
              />
            </Field>
          )}

          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Reason
            </Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Why is this meeting happening?"
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Staff notes (internal, optional)
            </Label>
            <textarea
              value={staffNotes}
              onChange={(e) => setStaffNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </div>

          {!isPaid && (
            <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-stone-300"
              />
              Send confirmation email to client
            </label>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Booking…
              </>
            ) : (
              "Create appointment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
