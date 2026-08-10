-- ============================================================================
-- Initial Consultation Agreement
--
-- Clients booking an appointment type that requires it (PR consultations) sign
-- an agreement inline at booking. Stored LIGHTWEIGHT: the signed PDF (with the
-- signature embedded) lives in OneDrive via files.documents — never a blob in
-- the DB. The row keeps only the frozen terms snapshot + sign metadata + a FK
-- to the archived document.
--
-- No new table: the agreement is 1:1 with an appointment, which already has the
-- right RLS (service_role writes from the public booking flow; staff read).
-- ============================================================================

ALTER TABLE crm.appointment_types
  ADD COLUMN IF NOT EXISTS requires_consultation_agreement BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN crm.appointment_types.requires_consultation_agreement IS
  'When true, public bookings of this type must sign the Initial Consultation Agreement (PR consultations).';

ALTER TABLE crm.appointments
  ADD COLUMN IF NOT EXISTS consultation_agreement_signed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_agreement_ip          INET,
  ADD COLUMN IF NOT EXISTS consultation_agreement_user_agent  TEXT,
  ADD COLUMN IF NOT EXISTS consultation_agreement_terms       JSONB,
  ADD COLUMN IF NOT EXISTS consultation_agreement_document_id UUID REFERENCES files.documents(id);
