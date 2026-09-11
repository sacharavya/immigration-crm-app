// Centralised "what does this case actually owe?" arithmetic. All
// staff dashboards, the client pay portal, and the payment-request
// email must agree on the answer or staff see understated balances.
//
// The total a client owes for a case is:
//   service fee + government fee + HST
//
// Where each piece comes from:
//   - Service fee = cases.quoted_fee_cad (always).
//   - Government fee = retainer.government_fee_cad if a signed
//     retainer exists; otherwise cases.government_fee_cad (the live
//     quote on the case row). The retainer is the canonical snapshot
//     at signing — once signed, the case row's value can drift but
//     the client owes what they agreed to.
//   - HST mirrors render-retainer.tsx exactly: an explicit hst_cad on
//     the retainer wins (0 = wizard's HST checkbox was cleared, e.g.
//     client outside Canada); NULL on a retainer means "13% of the
//     service fee, computed at render time" (the wizard leaves it NULL
//     when apply_hst is on). No retainer at all means no HST yet.
//     Government fees are never in the HST base (tax-exempt
//     disbursements).
//
// "Outstanding" for a case = max(0, total - sum_of_payments).

export type CaseFeeInputs = {
  // From cases row.
  quoted_fee_cad: number | string | null;
  government_fee_cad: number | string | null;
};

export type RetainerFeeInputs = {
  // From the most recent SIGNED retainer (signed_at IS NOT NULL,
  // voided_at IS NULL, deleted_at IS NULL). Pass null when no such
  // retainer exists.
  government_fee_cad: number | string | null;
  hst_cad: number | string | null;
} | null;

export type FeeBreakdown = {
  serviceFeeCad: number;
  governmentFeeCad: number;
  hstCad: number;
  totalCad: number;
};

// The one place the NULL-means-13% rule lives outside the PDF renderer.
export function hstForRetainer(
  serviceFeeCad: number,
  hstCad: number | string | null | undefined,
): number {
  if (hstCad !== null && hstCad !== undefined) return Number(hstCad);
  return Math.round(serviceFeeCad * 0.13 * 100) / 100;
}

export function computeCaseFeeBreakdown(
  caseRow: CaseFeeInputs,
  retainer: RetainerFeeInputs,
): FeeBreakdown {
  const serviceFee = Number(caseRow.quoted_fee_cad ?? 0);
  const governmentFee = Number(
    retainer?.government_fee_cad ?? caseRow.government_fee_cad ?? 0,
  );
  const hst = retainer ? hstForRetainer(serviceFee, retainer.hst_cad) : 0;
  return {
    serviceFeeCad: serviceFee,
    governmentFeeCad: governmentFee,
    hstCad: hst,
    totalCad: serviceFee + governmentFee + hst,
  };
}

export function computeCaseOutstanding(
  caseRow: CaseFeeInputs,
  retainer: RetainerFeeInputs,
  collectedCad: number,
): number {
  const { totalCad } = computeCaseFeeBreakdown(caseRow, retainer);
  return Math.max(0, totalCad - collectedCad);
}
