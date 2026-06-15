"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { updateRetainerDetails } from "../retainer-actions";

export type RetainerDetailsValues = {
  service_description: string;
  government_fee_cad: number;
  first_installment_cad: number;
  second_installment_cad: number;
  hst_cad: number;
  withdrawal_refund_floor_cad: number;
};

const FEE_TOLERANCE = 0.011;

export function RetainerDetailsForm({
  retainerId,
  caseQuotedFeeCad,
  initial,
  onChange,
  onSaved,
  onCancel,
}: {
  retainerId: string;
  caseQuotedFeeCad: number;
  initial: RetainerDetailsValues;
  onChange?: (values: RetainerDetailsValues) => void;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<RetainerDetailsValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof RetainerDetailsValues>(
    key: K,
    raw: string,
  ) {
    const next: RetainerDetailsValues =
      key === "service_description"
        ? { ...values, [key]: raw as RetainerDetailsValues[K] }
        : { ...values, [key]: (Number(raw) || 0) as RetainerDetailsValues[K] };
    setValues(next);
    onChange?.(next);
  }

  const installmentsSum =
    values.first_installment_cad + values.second_installment_cad;
  const installmentsBalanced =
    Math.abs(installmentsSum - caseQuotedFeeCad) <= FEE_TOLERANCE;

  // Preview of the post-tax installment amounts that will appear on
  // the signed PDF. HST is distributed proportionally across the two
  // installments by the renderer; surfacing the same math here so
  // staff don't have to mentally apply tax to verify the schedule.
  const firstShareWithTax =
    caseQuotedFeeCad > 0
      ? values.first_installment_cad +
        (values.first_installment_cad / caseQuotedFeeCad) * values.hst_cad
      : 0;
  const secondShareWithTax =
    caseQuotedFeeCad > 0
      ? values.second_installment_cad +
        (values.second_installment_cad / caseQuotedFeeCad) * values.hst_cad
      : 0;
  const totalInclTax =
    caseQuotedFeeCad +
    values.hst_cad +
    values.government_fee_cad;

  function handleSubmit() {
    setError(null);
    if (!values.service_description.trim()) {
      setError("Service description is required.");
      return;
    }
    if (!installmentsBalanced) {
      setError(
        `First + Second installments must equal the quoted fee (${caseQuotedFeeCad.toFixed(2)} CAD).`,
      );
      return;
    }
    startTransition(async () => {
      const result = await updateRetainerDetails({
        retainerId,
        ...values,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-800">
          Retainer details
        </h3>
        <p className="text-xs text-stone-500">
          The fee breakdown and service description that appear in the
          agreement.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
          Service description
        </label>
        <Input
          value={values.service_description}
          onChange={(e) => update("service_description", e.target.value)}
          placeholder="e.g., Visitor Visa Application"
          maxLength={200}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          label="Government fee (CAD)"
          value={values.government_fee_cad}
          onChange={(v) => update("government_fee_cad", v)}
          disabled={pending}
        />
        <NumberField
          label="HST (CAD)"
          value={values.hst_cad}
          onChange={(v) => update("hst_cad", v)}
          disabled={pending}
        />
        <NumberField
          label="First installment (CAD)"
          value={values.first_installment_cad}
          onChange={(v) => update("first_installment_cad", v)}
          disabled={pending}
        />
        <NumberField
          label="Second installment (CAD)"
          value={values.second_installment_cad}
          onChange={(v) => update("second_installment_cad", v)}
          disabled={pending}
        />
        <NumberField
          label="Non-refundable on withdrawal (CAD)"
          value={values.withdrawal_refund_floor_cad}
          onChange={(v) => update("withdrawal_refund_floor_cad", v)}
          disabled={pending}
        />
      </div>

      <div
        className={`rounded-md border px-3 py-2 text-xs ${
          installmentsBalanced
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-300 bg-amber-50 text-amber-900"
        }`}
      >
        First + Second installments (pre-tax): {installmentsSum.toFixed(2)}{" "}
        CAD · Case quoted fee: {caseQuotedFeeCad.toFixed(2)} CAD ·{" "}
        {installmentsBalanced ? "balanced" : "must match within 1¢"}
      </div>

      {installmentsBalanced && (
        <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
          <p className="mb-1 font-semibold text-stone-800">
            Payment schedule on the signed PDF:
          </p>
          <div className="flex justify-between">
            <span>First installment (incl. HST)</span>
            <span className="tabular-nums">
              ${firstShareWithTax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Second installment (incl. HST)</span>
            <span className="tabular-nums">
              ${secondShareWithTax.toFixed(2)}
            </span>
          </div>
          {values.government_fee_cad > 0 && (
            <div className="flex justify-between">
              <span>Government fees</span>
              <span className="tabular-nums">
                ${values.government_fee_cad.toFixed(2)}
              </span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold">
            <span>Total (inclusive of tax)</span>
            <span className="tabular-nums">${totalInclTax.toFixed(2)}</span>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save details"
          )}
        </Button>
        {onCancel && (
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
