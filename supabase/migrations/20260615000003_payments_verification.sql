-- =========================================================================
-- Client-uploaded payment proofs now require staff verification before
-- they count toward "amount paid". Previously they hit the balance the
-- moment they landed — so a client upload could flip a case to "paid
-- in full" without anyone at the firm seeing the screenshot.
--
-- New columns:
--   verified_at  TIMESTAMPTZ  — stamped when staff approves the upload
--   verified_by  UUID         — staff who approved
--
-- Rule (enforced in the application layer, NOT a DB constraint):
--   counts_toward_balance := client_uploaded_at IS NULL
--                            OR verified_at IS NOT NULL
--
-- Translation:
--   - Staff-recorded payments (client_uploaded_at NULL) always count —
--     they were entered by staff, so verification is implicit.
--   - Client-portal uploads only count once verified_at is set.
--   - Rejected uploads stay soft-deleted (deleted_at IS NOT NULL); the
--     reject path is unchanged.
--
-- Backfill: every existing row gets verified_at = created_at. We don't
-- retroactively pull payments off the balance because:
--   (a) the firm was operating under the prior "auto-count" rule, so
--       those balances were the canonical ones at the time;
--   (b) marking pre-existing client uploads as "pending verification"
--       would silently flip many cases out of paid-in-full status.
-- =========================================================================

ALTER TABLE crm.payments
  ADD COLUMN verified_at TIMESTAMPTZ,
  ADD COLUMN verified_by UUID REFERENCES crm.staff(id);

-- Backfill: existing rows are treated as already-verified so this
-- change doesn't move the balance for anyone.
UPDATE crm.payments
   SET verified_at = created_at
 WHERE verified_at IS NULL;

-- Index the "pending verification" set so the payments dashboard can
-- pull the queue cheaply.
CREATE INDEX idx_payments_pending_verification
  ON crm.payments(client_uploaded_at)
  WHERE verified_at IS NULL
    AND client_uploaded_at IS NOT NULL
    AND deleted_at IS NULL;

COMMENT ON COLUMN crm.payments.verified_at IS
  'Set by staff when a client-uploaded payment proof is approved. Balance math only counts payments where verified_at IS NOT NULL OR client_uploaded_at IS NULL.';

COMMENT ON COLUMN crm.payments.verified_by IS
  'Staff who verified the client-uploaded payment.';

NOTIFY pgrst, 'reload schema';
