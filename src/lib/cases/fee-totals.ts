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
//   - HST = retainer.hst_cad if a signed retainer exists; otherwise
//     zero. The case row doesn't store HST; it's derived from the
//     apply_hst wizard flag at retainer creation.
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

export function computeCaseFeeBreakdown(
  caseRow: CaseFeeInputs,
  retainer: RetainerFeeInputs,
): FeeBreakdown {
  const serviceFee = Number(caseRow.quoted_fee_cad ?? 0);
  const governmentFee = Number(
    retainer?.government_fee_cad ?? caseRow.government_fee_cad ?? 0,
  );
  const hst = Number(retainer?.hst_cad ?? 0);
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
