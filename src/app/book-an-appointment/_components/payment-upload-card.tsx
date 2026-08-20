"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { uploadPaymentProof } from "../actions";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/heic", "application/pdf"];
const ALLOWED_HUMAN = "PNG, JPG, HEIC, or PDF · max 5 MB";
const MAX_BYTES = 5 * 1024 * 1024;
const FIRM_EMAIL = "info@bigbangimmigration.com";

export type PaymentUploadCardProps = {
  token: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  durationMinutes: number;
  feeCad: number;
  referenceCode: string; // first 8 chars of appointment.id
  // When set, the "received" view prompts the client to sign the consultation
  // agreement inline (the same link is also emailed as a fallback).
  signUrl?: string | null;
};

function formatFee(cad: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cad);
}

// Renders the exact APPT-8 copy for the payment-required state, plus the
// file picker + Submit button. Used by both the booking confirmation page
// (right after submit) and the management page (email-backup path).
export function PaymentUploadCard({
  token,
  typeName,
  dateDisplay,
  timeDisplay,
  durationMinutes,
  feeCad,
  referenceCode,
  signUrl,
}: PaymentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(f.type)) {
      setError("Please upload a PNG, JPG, HEIC, or PDF.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Maximum file size is 5 MB.");
      return;
    }
    setFile(f);
  }

  function submit() {
    if (!file) {
      setError("Pick a file first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", file);
      const result = await uploadPaymentProof(fd);
      if (!result.ok) {
        setError(translate(result.error));
        return;
      }
      setDone(true);
    });
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(referenceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard denied — the code is visible anyway
    }
  }

  if (done) {
    return (
      <div className="space-y-3 border border-emerald-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-stone-900">
          Payment received. You&apos;re booked!
        </h1>
        <p className="text-sm text-stone-600">
          Your appointment is confirmed. A confirmation email with the meeting
          details is on its way.
        </p>
        {signUrl && (
          <div className="mt-2 border-t border-stone-100 pt-3">
            <p className="text-sm font-semibold text-stone-900">
              One more step — sign your consultation agreement
            </p>
            <p className="mt-0.5 text-xs text-stone-600">
              We&apos;ve also emailed you this link.
            </p>
            <a
              href={signUrl}
              className="mt-2 inline-flex h-9 items-center bg-[var(--navy)] px-4 text-sm font-medium text-white hover:bg-[var(--navy)]/90"
            >
              Sign now
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 border border-stone-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⌛</div>
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            Almost there. Your slot is held.
          </h1>
          <p className="mt-1 text-sm text-stone-700">
            <strong>{typeName}</strong> on <strong>{dateDisplay}</strong> at{" "}
            <strong>{timeDisplay}</strong>
          </p>
          <p className="text-sm text-stone-500">
            {durationMinutes} minutes · {formatFee(feeCad)}
          </p>
        </div>
      </div>

      <hr className="border-stone-200" />

      <p className="text-sm leading-relaxed text-stone-700">
        To secure your spot for this consultation, send an Interac e-transfer
        for <strong>{formatFee(feeCad)}</strong> to{" "}
        <a
          href={`mailto:${FIRM_EMAIL}`}
          className="text-[var(--navy)] underline-offset-2 hover:underline"
        >
          {FIRM_EMAIL}
        </a>{" "}
        and upload your screenshot of the payment or payment receipt here. Your
        appointment is confirmed the moment your proof is submitted.
      </p>

      <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Include this reference in the e-transfer message field
        </div>
        <div className="mt-1 flex items-center gap-2">
          <code className="font-mono text-base text-stone-900">
            {referenceCode}
          </code>
          <button
            type="button"
            onClick={copyReference}
            className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:bg-stone-100"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
          Upload payment screenshot or receipt
        </label>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_MIME.join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          disabled={pending}
          className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-md file:border file:border-stone-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-100"
        />
        <p className="text-[11px] text-stone-500">{ALLOWED_HUMAN}</p>
        {file && (
          <p className="text-xs text-stone-700">Selected: {file.name}</p>
        )}
        {error && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending || !file}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--navy)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--navy)]/90 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Submit proof
            </>
          )}
        </button>
      </div>

      <hr className="border-stone-200" />

      <p className="text-xs leading-relaxed text-stone-500">
        The payment you make for the consultation can be applied as a deposit
        toward your retainer if you decide to proceed with us. If you choose
        not to retain our services, the payment will be kept as a consultation
        fee.
      </p>
      <p className="text-xs leading-relaxed text-amber-700">
        If we don&apos;t receive your payment proof by the end of the day, the
        slot will be released and your appointment cancelled.
      </p>
      <p className="text-xs text-stone-400">
        Closed this tab? A link to upload your proof was also sent to your
        email.
      </p>
    </div>
  );
}

function translate(code: string): string {
  switch (code) {
    case "invalid_token":
      return "This upload link is no longer valid.";
    case "not_pending_payment":
      return "This booking is no longer awaiting payment.";
    case "unsupported_file_type":
      return "Please upload a PNG, JPG, HEIC, or PDF.";
    case "file_too_large":
      return "Maximum file size is 5 MB.";
    case "upload_failed":
      return "We couldn't upload your file. Try again, or email it directly.";
    default:
      return "Something went wrong. Please try again.";
  }
}
