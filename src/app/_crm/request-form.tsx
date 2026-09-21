"use client";

import { Check, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { submitAccessRequest } from "./actions";

const FIRM_SIZES = [
  { value: "solo", label: "Solo practitioner" },
  { value: "2-5", label: "2-5 people" },
  { value: "6-15", label: "6-15 people" },
  { value: "16+", label: "16+ people" },
] as const;

export function RequestForm() {
  const [firmName, setFirmName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [rcicNumber, setRcicNumber] = useState("");
  const [firmSize, setFirmSize] = useState<
    (typeof FIRM_SIZES)[number]["value"]
  >("solo");
  const [currentSoftware, setCurrentSoftware] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!firmName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      setError("Firm name, contact name, email, and phone are required.");
      return;
    }
    if (!consent) {
      setError("Please agree to the privacy policy to continue.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await submitAccessRequest({
        firmName,
        contactName,
        email,
        phone,
        rcicNumber,
        firmSize,
        currentSoftware,
        message,
        consent: true,
      });
      if (!result.ok) {
        setError(
          result.error === "rate_limited"
            ? "Too many submissions. Please try again later or email us directly."
            : "Something went wrong. Please try again or email info@genzdatalabs.com.",
        );
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold text-[#0F5132]">
              Request received
            </h3>
            <p className="mt-1 text-sm text-[#4B5563]">
              Thanks for your interest in CaseBind. We onboard firms in small
              groups and will reach out to schedule an intro call and your
              training week.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)]">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            Firm name *
          </span>
          <input
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            Contact name *
          </span>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            Email *
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            Phone *
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            RCIC number (optional)
          </span>
          <input
            value={rcicNumber}
            onChange={(e) => setRcicNumber(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
            Current software (optional)
          </span>
          <input
            value={currentSoftware}
            onChange={(e) => setCurrentSoftware(e.target.value)}
            placeholder="Officio, spreadsheets, ..."
            disabled={pending}
            className="mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
          />
        </label>
      </div>

      <div className="mt-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
          Firm size
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          {FIRM_SIZES.map((opt) => (
            <label
              key={opt.value}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
                firmSize === opt.value
                  ? "border-[#0F5132] bg-[#EEF4F0]/60 shadow-sm ring-1 ring-[#0F5132]/30"
                  : "border-[#D9E2EC] bg-white hover:border-[#0F5132]/50"
              }`}
            >
              <input
                type="checkbox"
                checked={firmSize === opt.value}
                onChange={() => setFirmSize(opt.value)}
                disabled={pending}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                  firmSize === opt.value
                    ? "border-[#0F5132] bg-[#0F5132] text-white"
                    : "border-[#D9E2EC] bg-white text-transparent group-hover:border-[#0F5132]/50"
                }`}
              >
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <span className="font-medium text-[#0F5132]">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#4B5563]">
          What matters most to your firm? (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="The workflows you want to fix first, team setup, anything else we should know."
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-sm outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20"
        />
      </label>

      <label className="group mt-4 flex cursor-pointer items-start gap-2 text-xs text-[#4B5563]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={pending}
          className="sr-only"
        />
        <span
          aria-hidden
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
            consent
              ? "border-[#0F5132] bg-[#0F5132] text-white"
              : "border-[#D9E2EC] bg-white text-transparent group-hover:border-[#0F5132]/50"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <span>
          I agree to the collection and use of this information as described
          in the{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            className="text-[#0F5132] underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#0F5132] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#146540] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          "Request access"
        )}
      </button>
    </form>
  );
}
