"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { submitCasePaymentProof } from "../actions";

type Props = {
  token: string;
  amountDueCad: number;
};

export function PayUploadForm({ token, amountDueCad }: Props) {
  const [amountStr, setAmountStr] = useState(amountDueCad.toFixed(2));
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "success" } | { kind: "error"; reason: string }
  >({ kind: "idle" });
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus({ kind: "idle" });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setStatus({ kind: "error", reason: "Choose a file to upload." });
      return;
    }
    const amount = Number.parseFloat(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus({ kind: "error", reason: "Enter a valid amount." });
      return;
    }

    const fd = new FormData();
    fd.set("file", file);
    fd.set("amount_cad", amount.toFixed(2));

    startTransition(async () => {
      const res = await submitCasePaymentProof(token, fd);
      if ("error" in res) {
        setStatus({ kind: "error", reason: res.error });
        return;
      }
      setStatus({ kind: "success" });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  if (status.kind === "success") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-emerald-900">
          Thanks — proof uploaded.
        </h2>
        <p className="mt-2 text-sm text-emerald-800">
          Our team will verify it shortly and update your case. You can close
          this page.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
        Upload payment proof
      </h2>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-stone-600">
            Amount you sent (CAD)
          </span>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            max={amountDueCad.toFixed(2)}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={pending}
            className="mt-1 max-w-xs"
            required
          />
          <span className="mt-1 block text-[11px] text-stone-500">
            Pre-filled with the outstanding balance. Lower this if you sent
            a partial payment.
          </span>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-stone-600">
            Screenshot of confirmation
          </span>
          <Input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/heic,image/webp"
            onChange={handleFileChange}
            disabled={pending}
            className="mt-1"
            required
          />
          <span className="mt-1 block text-[11px] text-stone-500">
            PDF, PNG, JPG, HEIC, or WebP. Up to 10 MB.
          </span>
        </label>

        {status.kind === "error" && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {status.reason}
          </p>
        )}

        <Button type="submit" disabled={pending || !file}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload proof
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
