-- Pay in Office: onsite paid consultations can skip the e-transfer flow and
-- pay cash at the office. The booking confirms immediately; the fee snapshot
-- stays on the row so staff know to collect in person. Online bookings keep
-- the mandatory e-transfer proof flow (which now auto-confirms on upload;
-- the staff accept step is removed in app code).
ALTER TABLE crm.appointments
  ADD COLUMN IF NOT EXISTS pay_in_office BOOLEAN NOT NULL DEFAULT FALSE;
