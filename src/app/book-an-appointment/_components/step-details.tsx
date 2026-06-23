"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";

import { MeetingSidebar } from "./meeting-sidebar";
import type { LocationType, PublicBookingType, PublicSlot } from "./types";

export function StepDetails({
  type,
  slot,
  clientTimezone,
  submitting,
  onBack,
  onSubmit,
}: {
  type: PublicBookingType;
  slot: PublicSlot;
  clientTimezone: string;
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
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800 disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* ── Left sidebar: meeting summary ──────────────────── */}
        <MeetingSidebar
          type={type}
          slot={slot}
          clientTimezone={clientTimezone}
        />

        {/* ── Right: form ────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <form
            className="border border-stone-200 bg-white p-5"
            onSubmit={handleSubmit}
          >
            <h2 className="text-sm font-medium text-stone-700">
              Enter your details
            </h2>

            <div className="mt-4 space-y-4">
              <FormField label="Full name" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={submitting}
                  className="h-10 w-full border border-stone-200 bg-white px-3 text-sm"
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
                    className="h-10 w-full border border-stone-200 bg-white px-3 text-sm"
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
                    className="h-10 w-full border border-stone-200 bg-white px-3 text-sm"
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
                      className={`border px-3 py-1.5 text-sm capitalize ${
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
                  className="w-full border border-stone-200 bg-white px-3 py-2 text-sm"
                />
              </FormField>

              <label className="flex items-start gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 h-4 w-4 border-stone-300"
                />
                <span>
                  I agree to be contacted by Big Bang Immigration regarding this
                  appointment.
                </span>
              </label>
            </div>

            {localError && (
              <p className="mt-4 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {localError}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 items-center gap-2 bg-[var(--navy)] px-5 text-sm font-medium text-white hover:bg-[var(--navy-light)] disabled:opacity-60"
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
        </div>
      </div>
    </div>
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
