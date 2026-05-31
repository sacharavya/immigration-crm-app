"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";

import type { LocationType, PublicBookingType, PublicSlot } from "./types";

function formatSlot(iso: string, tz: string): string {
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

export function StepDetails({
  type,
  slot,
  firmTimezone,
  submitting,
  onBack,
  onSubmit,
}: {
  type: PublicBookingType;
  slot: PublicSlot;
  firmTimezone: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (input: {
    name: string;
    email: string;
    phone: string;
    reason: string;
    location_type: LocationType;
  }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [locationType, setLocationType] = useState<LocationType>(
    type.default_location_type,
  );
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setLocalError(
        "Please confirm consent so we can contact you about this appointment.",
      );
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim() || !reason.trim()) {
      setLocalError("Please fill in every required field.");
      return;
    }
    setLocalError(null);
    void onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      reason: reason.trim(),
      location_type: locationType,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 disabled:opacity-50"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div>
          <h1 className="text-lg font-semibold text-stone-900">{type.name}</h1>
          <p className="text-sm text-stone-600">
            {formatSlot(slot.start_utc, firmTimezone)} · {type.duration_minutes} min
          </p>
        </div>
      </header>

      <div className="space-y-4 rounded-md border border-stone-200 bg-white p-5">
        <FormField label="Full name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={submitting}
            className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Email" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={submitting}
              className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
            />
          </FormField>
          <FormField label="Phone" required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="+1 416 555 0123"
              disabled={submitting}
              className="h-10 w-full rounded-md border border-stone-200 bg-white px-3 text-sm"
            />
          </FormField>
        </div>

        <FormField label="How would you like to meet?">
          <div className="flex gap-2">
            {(["online", "onsite"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLocationType(opt)}
                disabled={submitting}
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
        </FormField>

        <FormField label="What would you like to discuss?" required>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            rows={4}
            placeholder="Briefly describe what you'd like to discuss."
            className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </FormField>

        <label className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={submitting}
            className="mt-1 h-4 w-4 rounded border-stone-300"
          />
          <span>
            I agree to be contacted by Big Bang Immigration regarding this
            appointment.
          </span>
        </label>
      </div>

      {localError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {localError}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--navy)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--navy)]/90 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming…
            </>
          ) : (
            "Confirm appointment"
          )}
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
