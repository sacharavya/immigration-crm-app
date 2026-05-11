"use client";

import { format } from "date-fns";
import {
  ExternalLink,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/validators/payment";

import { attachPaymentProof, removePaymentProof } from "../actions";

import { RecordPaymentTrigger } from "./record-payment-trigger";

const ACCEPTED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
  "image/webp",
];
const MAX_BYTES = 10 * 1024 * 1024;

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const fmtCad = (n: number) => cadFormatter.format(n);

export type PaymentRow = {
  id: string;
  amount_cad: number;
  method: PaymentMethod;
  reference: string | null;
  received_date: string;
  notes: string | null;
  is_refund: boolean;
  recorded_by_name: string | null;
  proof: {
    documentId: string;
    fileName: string | null;
    webUrl: string | null;
    mimeType: string | null;
  } | null;
};

type Props = {
  caseId: string;
  payments: PaymentRow[];
  totalQuoted: number;
  canManage: boolean;
};

export function PaymentsTab({
  caseId,
  payments,
  totalQuoted,
  canManage,
}: Props) {
  const collected = payments.reduce(
    (sum, p) => sum + (p.is_refund ? -1 : 1) * p.amount_cad,
    0,
  );
  const outstanding = Math.max(0, totalQuoted - collected);
  const pct =
    totalQuoted > 0
      ? Math.min(100, Math.round((collected / totalQuoted) * 100))
      : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Payments
            </h2>
            <p className="text-xs text-stone-500">
              All payments recorded against this case. Upload a receipt or
              screenshot per payment for the audit trail.
            </p>
          </div>
          {canManage && (
            <RecordPaymentTrigger
              caseId={caseId}
              triggerVariant="default"
              triggerSize="default"
              triggerClassName=""
            />
          )}
        </header>

        <div className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3">
          <Stat label="Collected" value={fmtCad(collected)} accent="emerald" />
          <Stat label="Quoted" value={fmtCad(totalQuoted)} />
          <Stat
            label="Outstanding"
            value={fmtCad(outstanding)}
            accent={outstanding > 0 ? "amber" : "emerald"}
          />
          <div className="sm:col-span-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-stone-500">{pct}% paid</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-500">
            No payments yet. {canManage ? "Record one to get started." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Recorded by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-stone-700">
                      {format(new Date(p.received_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell
                      className={`whitespace-nowrap text-right tabular-nums ${
                        p.is_refund ? "text-red-700" : "text-stone-900"
                      }`}
                    >
                      {p.is_refund ? "-" : ""}
                      {fmtCad(p.amount_cad)}
                    </TableCell>
                    <TableCell className="text-stone-700">
                      {PAYMENT_METHOD_LABEL[p.method]}
                    </TableCell>
                    <TableCell className="text-stone-500">
                      {p.reference || "—"}
                    </TableCell>
                    <TableCell>
                      <ProofCell
                        paymentId={p.id}
                        proof={p.proof}
                        canManage={canManage}
                      />
                    </TableCell>
                    <TableCell className="max-w-[18rem] truncate text-stone-500">
                      {p.notes || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">
                      {p.recorded_by_name ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
        ? "text-amber-700"
        : "text-stone-900";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function ProofCell({
  paymentId,
  proof,
  canManage,
}: {
  paymentId: string;
  proof: PaymentRow["proof"];
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const [removePending, startRemove] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function pickAndUpload(file: File) {
    setError(null);
    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("PDF, PNG, JPEG, HEIC or WebP only.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 10 MB.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    startUpload(async () => {
      const res = await attachPaymentProof(paymentId, fd);
      if ("error" in res) setError(res.error);
    });
  }

  function handleRemove() {
    if (!confirm("Unlink this proof from the payment? The file stays in OneDrive.")) {
      return;
    }
    setError(null);
    startRemove(async () => {
      const res = await removePaymentProof(paymentId);
      if ("error" in res) setError(res.error);
    });
  }

  if (proof) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Paperclip className="h-3 w-3 shrink-0 text-stone-400" />
          {proof.webUrl ? (
            <a
              href={proof.webUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 truncate text-xs font-medium text-[var(--navy)] underline-offset-2 hover:underline"
              title={proof.fileName ?? undefined}
            >
              <span className="max-w-[12rem] truncate">
                {proof.fileName ?? "View"}
              </span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-stone-500">
              {proof.fileName ?? "Attached"}
            </span>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removePending}
            className="inline-flex w-fit items-center gap-1 text-[11px] text-stone-500 hover:text-destructive disabled:opacity-50"
          >
            {removePending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Unlink
          </button>
        )}
      </div>
    );
  }

  if (!canManage) {
    return <span className="text-xs text-stone-400">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickAndUpload(f);
          e.currentTarget.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploadPending}
        className="w-fit"
      >
        {uploadPending ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="mr-1 h-3 w-3" />
            Add proof
          </>
        )}
      </Button>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
