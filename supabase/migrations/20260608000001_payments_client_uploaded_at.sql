-- =========================================================================
-- Client-uploaded payment proofs (case payment-request portal).
--
-- Staff can now send a payment-request email to the client (button on
-- the case detail page → /pay/<client_portal_token>). The client lands
-- on the public page, follows the Interac e-transfer instructions, and
-- uploads a screenshot. The portal action creates a crm.payments row
-- and stamps client_uploaded_at so the dashboard knows the row needs
-- staff review.
--
-- One column on crm.payments:
--   client_uploaded_at TIMESTAMPTZ
--     Set by the public submitCasePaymentProof action. NULL means
--     "staff recorded directly" (the existing path); non-NULL means
--     "client uploaded via portal, awaiting verification."
--
-- Balance calculations DO NOT filter on this column. Client-uploaded
-- payments count toward the case balance the moment they land — so
-- the "Notify client for payment" button correctly disables once the
-- client uploads enough proof. If staff later finds the proof is bad,
-- soft-deleting the payment (the existing reject path) reverses the
-- balance immediately.
--
-- Index on the column: most reads are "show me unverified client
-- uploads," which would otherwise scan the whole table.
-- =========================================================================

ALTER TABLE crm.payments
  ADD COLUMN client_uploaded_at TIMESTAMPTZ;

CREATE INDEX idx_payments_client_uploaded
  ON crm.payments(client_uploaded_at)
  WHERE client_uploaded_at IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN crm.payments.client_uploaded_at IS
  'Stamped when a payment row is created by the client portal (/pay/<token>) instead of by staff. The /dashboard/payments review surface uses this to render an "awaiting verification" badge; balance math ignores the column.';
