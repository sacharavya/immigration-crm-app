// Single source of truth for "does this payment count toward the case
// balance?" Every dashboard, every email, every server action that
// sums payments routes through here so the rule can't drift.
//
// Rule:
//   counts := client_uploaded_at IS NULL  -- staff-recorded, implicit verify
//             OR verified_at IS NOT NULL  -- client-uploaded + staff approved
//
// Soft-deleted rows (deleted_at IS NOT NULL) are filtered out before
// this point by the SELECT — they never reach this function.

export type PaymentVerificationFields = {
  client_uploaded_at: string | null;
  verified_at: string | null;
};

export function isPaymentVerified(p: PaymentVerificationFields): boolean {
  if (p.client_uploaded_at === null) return true;
  return p.verified_at !== null;
}

// Convenience: sum a list of payments using the verification gate.
// `is_refund` rows subtract; everything else adds. Unverified client
// uploads are EXCLUDED from the sum entirely (they sit in a separate
// "pending verification" bucket).
export type SumPaymentRow = PaymentVerificationFields & {
  amount_cad: number | string;
  is_refund?: boolean;
};

export function sumVerifiedPayments(rows: SumPaymentRow[]): number {
  return rows.reduce((acc, p) => {
    if (!isPaymentVerified(p)) return acc;
    const sign = p.is_refund ? -1 : 1;
    return acc + sign * Number(p.amount_cad);
  }, 0);
}

// Convenience for the "money sitting in the inbox" stat: sum of
// client-uploaded payments that haven't been verified yet. Refunds
// don't apply here (you can't refund something not yet collected).
export function sumPendingVerification(rows: SumPaymentRow[]): number {
  return rows.reduce((acc, p) => {
    if (p.client_uploaded_at === null) return acc;
    if (p.verified_at !== null) return acc;
    return acc + Number(p.amount_cad);
  }, 0);
}
