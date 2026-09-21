"use client";

import { Check, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { submitContactInquiry } from "./actions";
import { CONTACT_SERVICES } from "./constants";

// Homepage contact form, styled to the marketing design system exactly
// like the CRM landing's request form.
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<(typeof CONTACT_SERVICES)[number]>(
    CONTACT_SERVICES[0],
  );
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError("Name, email, and phone are required.");
      return;
    }
    if (!consent) {
      setError("Please agree to the privacy policy to continue.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await submitContactInquiry({
        name,
        email,
        phone,
        service,
        message,
        consent: true,
      });
      if (!result.ok) {
        setError(
          result.error === "rate_limited"
            ? "Too many submissions. Please try again later or call us."
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
            <h3 className="text-sm font-semibold text-[#0D4231]">
              Message received
            </h3>
            <p className="mt-1 text-sm text-[#5A6A85]">
              Thanks for reaching out. A member of our team will get back to
              you, typically within one business day. Want to move faster?
            </p>
            <Link
              href="/book-an-appointment"
              className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-[#0D4231] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#14523D]"
            >
              Book a consultation now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    "mt-1 h-10 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 text-sm outline-none focus:border-[#0D4231] focus:ring-2 focus:ring-[#0D4231]/20";
  const labelClass =
    "text-xs font-semibold uppercase tracking-wider text-[#5A6A85]";

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)]"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Full name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Phone *</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Service you are interested in</span>
          <select
            value={service}
            onChange={(e) =>
              setService(e.target.value as (typeof CONTACT_SERVICES)[number])
            }
            disabled={pending}
            className={inputClass}
          >
            {CONTACT_SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block">
        <span className={labelClass}>Your message (optional)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Tell us briefly about your situation and goals."
          disabled={pending}
          className="mt-1 w-full rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-sm outline-none focus:border-[#0D4231] focus:ring-2 focus:ring-[#0D4231]/20"
        />
      </label>

      <label className="group mt-4 flex cursor-pointer items-start gap-2 text-xs text-[#5A6A85]">
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
              ? "border-[#0D4231] bg-[#0D4231] text-white"
              : "border-[#D9E2EC] bg-white text-transparent group-hover:border-[#0D4231]/50"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <span>
          I agree to the collection and use of my information as described in
          the{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            className="text-[#0D4231] underline underline-offset-2"
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
        className="mt-5 inline-flex h-11 items-center gap-2 rounded-[10px] bg-[#0D4231] px-6 text-sm font-semibold text-white shadow-[0_12px_30px_-14px_rgba(61,111,216,.7)] transition-colors hover:bg-[#14523D] disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          "Send message"
        )}
      </button>
    </form>
  );
}
