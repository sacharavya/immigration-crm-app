"use client";

import { ChevronLeft, Loader2 } from "lucide-react";
import { useState } from "react";

import { MeetingSidebar } from "./meeting-sidebar";
import type { LocationType, PublicBookingType, PublicSlot } from "./types";

const LANGUAGE_TESTS = [
  "IELTS General",
  "IELTS Academic",
  "CELPIP-General",
  "PTE Core",
  "TEF Canada",
  "TCF Canada",
  "Not taken yet",
  "Other",
] as const;

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "common_law", label: "Common-law" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
] as const;

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
    pay_in_office: boolean;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    date_of_birth: string;
    marital_status: string;
    highest_education: string;
    language_test: string;
    language_score: string;
    occupation: string;
  }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [locationType, setLocationType] = useState<LocationType>(
    type.default_location_type,
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postal, setPostal] = useState("");
  const [dob, setDob] = useState("");
  const [marital, setMarital] = useState("");
  const [education, setEducation] = useState("");
  const [languageTest, setLanguageTest] = useState("");
  const [languageScore, setLanguageScore] = useState("");
  const [occupation, setOccupation] = useState("");
  const [payInOffice, setPayInOffice] = useState(false);
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const isPaidType = type.fee_cad !== null && type.fee_cad > 0;
  // The cash option only exists for in-person meetings.
  const showPayInOffice = isPaidType && locationType === "onsite";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) {
      setLocalError(
        "Please confirm consent so we can contact you about this appointment.",
      );
      return;
    }
    if (
      !name.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !reason.trim() ||
      !address.trim()
    ) {
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
      pay_in_office: showPayInOffice && payInOffice,
      address: address.trim(),
      city: city.trim(),
      province: province.trim(),
      postal_code: postal.trim(),
      date_of_birth: dob,
      marital_status: marital,
      highest_education: education.trim(),
      language_test: languageTest,
      language_score: languageScore.trim(),
      occupation: occupation.trim(),
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
            className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] sm:p-7"
            onSubmit={handleSubmit}
          >
            <h2 className="text-xl font-extrabold tracking-[-.01em] text-[#1B365D]">
              Enter your details
            </h2>

            <div className="mt-4 space-y-4">
              <FormField label="Full name" required>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={submitting}
                  className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
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
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
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
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
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
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                        locationType === opt
                          ? "border-[#3D6FD8] bg-[#3D6FD8] text-white"
                          : "border-[#D9E2EC] bg-white text-[#1B365D] hover:border-[#3D6FD8]/60"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </FormField>

              {showPayInOffice && (
                <label className="flex items-start gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={payInOffice}
                    onChange={(e) => setPayInOffice(e.target.checked)}
                    disabled={submitting}
                    className="mt-1 h-4 w-4 border-stone-300"
                  />
                  <span>
                    <span className="font-medium">Pay in office</span>
                    <span className="block text-xs text-stone-500">
                      Pay cash when you arrive. Your appointment is confirmed
                      right away, no e-transfer needed.
                    </span>
                  </span>
                </label>
              )}

              <FormField label="What would you like to discuss?" required>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={submitting}
                  rows={4}
                  placeholder="Briefly describe what you'd like to discuss."
                  className="w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                />
              </FormField>

              <div className="border-t border-[#EDF1F7] pt-4">
                <p className="font-[family-name:var(--font-dm-mono)] text-[11px] font-medium uppercase tracking-[.14em] text-[#5A6A85]">
                  About you
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Helps us prepare and tailor advice to your situation.
                </p>
              </div>

              <FormField label="Street address" required>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  autoComplete="street-address"
                  disabled={submitting}
                  className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="City">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
                <FormField label="Province / State">
                  <input
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
                <FormField label="Postal / ZIP">
                  <input
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Date of birth">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
                <FormField label="Marital status">
                  <select
                    value={marital}
                    onChange={(e) => setMarital(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  >
                    <option value="">Select…</option>
                    {MARITAL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Highest education">
                  <input
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. Bachelor's"
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
                <FormField label="Language test">
                  <select
                    value={languageTest}
                    onChange={(e) => setLanguageTest(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  >
                    <option value="">Select…</option>
                    {LANGUAGE_TESTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Test scores">
                  <input
                    value={languageScore}
                    onChange={(e) => setLanguageScore(e.target.value)}
                    disabled={submitting}
                    placeholder="e.g. L8 R7 W7 S7 (or 7 each)"
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
                <FormField label="Current occupation">
                  <input
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    disabled={submitting}
                    className="h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#3D6FD8] focus:ring-2 focus:ring-[#3D6FD8]/20"
                  />
                </FormField>
              </div>

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
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#3D6FD8] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#2F5BC0] disabled:opacity-60"
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
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#5A6A85]">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
