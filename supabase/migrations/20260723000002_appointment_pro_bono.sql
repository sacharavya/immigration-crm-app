-- Pro bono consultations: staff can waive the fee on a paid appointment type,
-- so the firm does the consultation for free. Recorded (not just fee=0) so the
-- firm can report on waived consultations.
ALTER TABLE crm.appointments
  ADD COLUMN IF NOT EXISTS is_pro_bono BOOLEAN NOT NULL DEFAULT FALSE;
