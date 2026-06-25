-- ----------------------------------------------------------------------------
-- "Passport requested" (PPR) as a loggable IRCC event.
--
-- Passport Request is a real IRCC interaction that happens while the case is
-- still "Submitted to IRCC" — it is NOT the final decision. Previously the only
-- place "passport requested" surfaced was the case_status of the same name
-- (whose display label is "Approved"), conflating PPR with approval.
--
-- This adds a distinct crm.event_type value so staff can record the PPR as a
-- case event (via the "Record event" dialog) without advancing the phase. The
-- decision milestone keeps its own status (passport_requested = "Approved").
--
-- ADD VALUE IF NOT EXISTS is safe to re-run and cannot run in the same
-- transaction as a statement that USES the new value — nothing here does, so a
-- standalone migration is fine (mirrors 20260516000001 / 20260520000001).
-- ----------------------------------------------------------------------------

ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'passport_requested';
