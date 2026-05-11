-- =========================================================================
-- Payment proof attachments.
--
-- Each payment can carry a single proof (e-Transfer screenshot, bank
-- receipt PDF, cheque image, etc.). Stored as a files.documents row so
-- the OneDrive integration treats it identically to retainer / intake
-- documents — same drive, same web URL, same lifecycle.
--
-- Multi-proof per payment is out of scope: in practice the firm uploads
-- one canonical receipt per transaction. Replacing it just rewrites
-- proof_document_id; the old documents row stays around for audit.
-- =========================================================================

ALTER TABLE crm.payments
  ADD COLUMN proof_document_id UUID REFERENCES files.documents(id);

CREATE INDEX idx_payments_proof
  ON crm.payments(proof_document_id)
  WHERE proof_document_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN crm.payments.proof_document_id IS
  'Optional FK to files.documents row holding the receipt / screenshot for this payment. Stored in the case OneDrive folder under "00 Payments". Null until staff uploads proof.';
