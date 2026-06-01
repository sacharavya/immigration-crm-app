"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";

import { updateConsultationPaymentNature } from "../actions";

type Nature =
  | "pending_decision"
  | "applied_as_deposit"
  | "kept_as_consultation_fee";

const NATURE_LABEL: Record<Nature, string> = {
  pending_decision: "Pending decision",
  applied_as_deposit: "Applied as deposit",
  kept_as_consultation_fee: "Kept as consultation fee",
};

const NATURE_TONE: Record<Nature, string> = {
  pending_decision: "bg-stone-100 text-stone-700",
  applied_as_deposit: "bg-sky-100 text-sky-800",
  kept_as_consultation_fee: "bg-emerald-100 text-emerald-800",
};

// APPT-8: per-row consultation outcome control. Only renders when the row
// already has a non-null consultation_payment_nature (i.e., the payment was
// created via the consultation-accept flow). Non-consultation payments
// don't surface this control.
export function ConsultationOutcomeCell({
  paymentId,
  initial,
  canEdit,
}: {
  paymentId: string;
  initial: Nature;
  canEdit: boolean;
}) {
  const [nature, setNature] = useState<Nature>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: Nature) {
    if (next === nature) return;
    const previous = nature;
    setNature(next); // optimistic
    setError(null);
    startTransition(async () => {
      const res = await updateConsultationPaymentNature({
        payment_id: paymentId,
        nature: next,
      });
      if (!res.ok) {
        setNature(previous);
        setError(res.error);
      }
    });
  }

  if (!canEdit) {
    return (
      <Badge
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${NATURE_TONE[nature]}`}
      >
        Consultation: {NATURE_LABEL[nature]}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <select
        value={nature}
        onChange={(e) => change(e.target.value as Nature)}
        disabled={pending}
        className={`h-7 rounded-full border-0 px-2 text-[11px] font-medium ${NATURE_TONE[nature]} focus:outline-none focus:ring-2 focus:ring-stone-300`}
      >
        <option value="pending_decision">
          Consultation: pending decision
        </option>
        <option value="applied_as_deposit">
          Consultation: applied as deposit
        </option>
        <option value="kept_as_consultation_fee">
          Consultation: kept as consultation fee
        </option>
      </select>
      {error && (
        <span className="text-[10px] text-rose-700">{error}</span>
      )}
    </div>
  );
}
