"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { SignaturePad, type SignaturePadHandle } from "@/components/signature-pad";

import { submitConsultationSignature } from "../actions";

export function SigningForm({ token }: { token: string }) {
  const [empty, setEmpty] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  async function submit() {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setError("Please sign in the box above.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await submitConsultationSignature({
      token,
      signatureDataUrl: pad.toDataUrl(),
    });
    setSubmitting(false);
    if (result.ok) setDone(true);
    else if (result.error === "expired") setError("This signing link has expired.");
    else setError("We couldn't save your signature. Please try again.");
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-200 bg-white p-6">
        <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
        <div>
          <h2 className="text-lg font-semibold text-stone-900">
            Signed — thank you.
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            A copy of your signed consultation agreement has been emailed to you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-stone-200 bg-white p-6">
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
        Your signature
      </label>
      <SignaturePad ref={padRef} onChange={setEmpty} />
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={submitting || empty}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--navy)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--navy)]/90 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          "Agree & sign"
        )}
      </button>
    </div>
  );
}
