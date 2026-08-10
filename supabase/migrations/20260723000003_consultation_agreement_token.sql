-- Consultation agreement is now delivered by an emailed sign-link (like the
-- retainer), so the client can sign whether they self-booked, were booked by
-- staff, or are a pro-bono case. A dedicated token is needed because
-- management_token is null for free/pro-bono bookings.
ALTER TABLE crm.appointments
  ADD COLUMN IF NOT EXISTS consultation_agreement_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS consultation_agreement_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consultation_agreement_sent_at TIMESTAMPTZ;
