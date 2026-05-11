"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { RecordPaymentTrigger } from "./record-payment-trigger";

const formatCad = (n: number) =>
  n.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Classify the gate reason so the dialog renders the right call-to-
// action. The reason strings are returned verbatim from
// crm.can_advance_phase — keep these substring matches in sync with
// that function's RAISE messages.
function classifyReason(reason: string): "payment" | "documents" | "other" {
  const lower = reason.toLowerCase();
  if (
    lower.includes("payment required") ||
    lower.includes("outstanding")
  ) {
    return "payment";
  }
  if (lower.includes("required document") || lower.includes("not yet accepted")) {
    return "documents";
  }
  return "other";
}

export function GateBlockedView({
  caseId,
  reason,
  quotedFeeCad,
  retainerMinimumCad,
  collectedCad,
  onCancel,
}: {
  caseId: string;
  reason: string;
  quotedFeeCad: number;
  retainerMinimumCad: number | null;
  collectedCad: number;
  onCancel: () => void;
}) {
  const kind = classifyReason(reason);
  const shortfall = Math.max(
    0,
    (retainerMinimumCad ?? quotedFeeCad) - collectedCad,
  );

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <DialogTitle>Cannot advance</DialogTitle>
            <DialogDescription>{reason}</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {kind === "payment" && (
        <dl className="rounded-lg border border-stone-200 bg-stone-50 p-4">
          <Row label="Quoted fee" value={`$${formatCad(quotedFeeCad)} CAD`} />
          {retainerMinimumCad !== null && (
            <Row
              label="Retainer minimum"
              value={`$${formatCad(retainerMinimumCad)} CAD`}
            />
          )}
          <Row
            label="Received so far"
            value={`$${formatCad(collectedCad)} CAD`}
            emphasised={shortfall > 0}
          />
        </dl>
      )}

      {kind === "documents" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Open the <strong>Documents</strong> tab to see which items are
          still missing. Required docs are marked with a red asterisk.
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
        {kind === "payment" && (
          <RecordPaymentTrigger
            caseId={caseId}
            defaultAmount={shortfall > 0 ? shortfall : undefined}
            onSuccess={onCancel}
            triggerVariant="default"
            triggerSize="default"
            triggerClassName=""
          >
            Record payment →
          </RecordPaymentTrigger>
        )}
      </DialogFooter>
    </>
  );
}

function Row({
  label,
  value,
  emphasised = false,
}: {
  label: string;
  value: string;
  emphasised?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <dt className="text-stone-500">{label}</dt>
      <dd
        className={`font-medium ${emphasised ? "text-destructive" : "text-stone-900"}`}
      >
        {value}
      </dd>
    </div>
  );
}
