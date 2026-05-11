-- =========================================================================
-- Lock retainer agreements to the data captured at sending / signing time.
--
-- Without these snapshot columns, loadRetainerData re-reads the live
-- crm.clients and crm.staff rows on every render — which means a typo
-- fix to a client's address today would silently rewrite a retainer
-- signed last month. "Once done is done" requires the rendering layer
-- to read from immutable snapshots once a retainer leaves draft state.
--
-- All columns are nullable so existing retainer rows keep working —
-- they continue to render from live data until the next send, at which
-- point the snapshots are populated.
--
-- Pre-existing fee snapshot columns (quoted_fee_cad_at_signing, etc.)
-- already follow this pattern; this migration extends it to identity /
-- contact / signature fields.
-- =========================================================================

ALTER TABLE crm.retainer_agreements
  ADD COLUMN client_legal_name_full_at_signing TEXT,
  ADD COLUMN client_given_names_at_signing     TEXT,
  ADD COLUMN client_family_name_at_signing     TEXT,
  ADD COLUMN client_address_at_signing         TEXT,
  ADD COLUMN client_email_at_signing           TEXT,
  ADD COLUMN client_phone_at_signing           TEXT,

  ADD COLUMN rcic_name_at_signing              TEXT,
  ADD COLUMN rcic_membership_number_at_signing TEXT,
  ADD COLUMN rcic_address_at_signing           TEXT,
  ADD COLUMN rcic_phone_at_signing             TEXT,
  ADD COLUMN rcic_email_at_signing             TEXT,
  ADD COLUMN rcic_signature_image_url_at_signing TEXT,
  ADD COLUMN rcic_printed_name_at_signing      TEXT;

COMMENT ON COLUMN crm.retainer_agreements.client_legal_name_full_at_signing IS
  'Snapshot of crm.clients.legal_name_full at the moment the retainer was sent for signing. Read by loadRetainerData when status != draft/expired so post-sign edits to clients do not retroactively rewrite the agreement.';

COMMENT ON COLUMN crm.retainer_agreements.rcic_signature_image_url_at_signing IS
  'Snapshot of crm.staff.signature_image_url at sign time. Means a later signature replacement on the staff row does not change the visual rendering of historical retainers.';
