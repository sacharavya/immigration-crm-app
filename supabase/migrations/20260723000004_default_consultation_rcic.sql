-- Default RCIC for consultation agreements. When a booking has no assigned
-- staff RCIC (e.g. public self-serve), the agreement uses this RCIC's details
-- and signature. Nullable — falls back to the firm's sole/first active RCIC.
ALTER TABLE crm.appointment_settings
  ADD COLUMN IF NOT EXISTS default_rcic_staff_id UUID REFERENCES crm.staff(id);
