"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { submitNocApplication } from "../actions";

// Shown right under the eligibility verdict: the moment someone learns their
// occupation's SOWP / Express Entry status is when they decide to act.
export function ApplyForm({
  nocCode,
  nocTitle,
  teer,
  sowpStatus,
}: {
  nocCode: string;
  nocTitle: string;
  teer: number;
  sowpStatus: string;
}) {
  const sowpEligible = sowpStatus === "eligible";
  const expressEligible = teer <= 3;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState<"sowp" | "express_entry" | "not_sure">(
    sowpEligible ? "sowp" : expressEligible ? "express_entry" : "not_sure",
  );
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!consent) {
      setError("Please agree to the privacy policy to continue.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await submitNocApplication({
        name,
        email,
        phone,
        intent,
        note,
        consent: true,
        noc: { code: nocCode, title: nocTitle, teer, sowp_status: sowpStatus },
      });
      if (!result.ok) {
        setError(
          result.error === "rate_limited"
            ? "Too many submissions. Please try again later or call us."
            : "Something went wrong. Please try again or email us directly.",
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
      <div className="border border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              We have your details
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              A licensed consultant will reach out, typically within one
              business day. Want to move faster?
            </p>
            <Link
              href="/book-an-appointment"
              className="mt-3 inline-flex items-center gap-1.5 bg-[var(--navy)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--navy)]/90"
            >
              Book a consultation now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-stone-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-stone-900">
        {sowpEligible
          ? "Apply for your spouse's open work permit with Big Bang"
          : expressEligible
            ? "Start your Express Entry application with Big Bang"
            : "This occupation lost SOWP eligibility - talk to us about your alternatives"}
      </h3>
      <p className="mt-1 text-xs text-stone-500">
        Your NOC details ({nocCode} · {nocTitle}) are included automatically.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          disabled={pending}
          className="h-10 border border-stone-200 bg-white px-3 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={pending}
          className="h-10 border border-stone-200 bg-white px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          disabled={pending}
          className="h-10 border border-stone-200 bg-white px-3 text-sm"
        />
        <select
          value={intent}
          onChange={(e) =>
            setIntent(e.target.value as "sowp" | "express_entry" | "not_sure")
          }
          disabled={pending}
          className="h-10 border border-stone-200 bg-white px-3 text-sm"
        >
          <option value="sowp">Spousal open work permit (SOWP)</option>
          <option value="express_entry">Express Entry</option>
          <option value="not_sure">Not sure - advise me</option>
        </select>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything we should know? (optional)"
        rows={2}
        maxLength={1000}
        disabled={pending}
        className="mt-3 w-full border border-stone-200 bg-white px-3 py-2 text-sm"
      />

      <label className="mt-3 flex items-start gap-2 text-xs text-stone-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={pending}
          className="mt-0.5 h-4 w-4 border-stone-300"
        />
        <span>
          I agree to the collection and use of my information as described in
          the{" "}
          <Link
            href="/privacy-policy"
            target="_blank"
            className="text-[var(--navy)] underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      {error && (
        <p className="mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex h-10 items-center gap-2 bg-[var(--navy)] px-5 text-sm font-medium text-white hover:bg-[var(--navy)]/90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending...
          </>
        ) : (
          "Get started"
        )}
      </button>
    </form>
  );
}
