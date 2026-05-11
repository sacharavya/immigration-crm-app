-- =========================================================================
-- Client document-upload portal token.
--
-- One persistent token per case, stored on crm.cases. Lookups validate
-- the token + the case status; tokens auto-expire when the case moves
-- past 'documentation_review' or is closed (no row mutation needed —
-- the lookup just stops succeeding once status leaves the allowed set).
--
-- Audit log_change trigger on crm.cases captures every token rotation
-- automatically.
-- =========================================================================

ALTER TABLE crm.cases
  ADD COLUMN client_portal_token UUID UNIQUE,
  ADD COLUMN client_portal_token_created_at TIMESTAMPTZ;

CREATE INDEX idx_cases_client_portal_token
  ON crm.cases(client_portal_token)
  WHERE client_portal_token IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN crm.cases.client_portal_token IS
  'UUID token for the public client document-upload portal at /upload/<token>. Active only while cases.status is in (retainer_pending, documentation_in_progress, documentation_review). Rotating UPDATEs the column; staff revoke = SET NULL.';
