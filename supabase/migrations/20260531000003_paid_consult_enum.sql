-- ============================================================================
-- APPT-8 part 1 of 2: extend crm.appointment_status with the two new states
-- needed for paid consultations.
--
--   pending_payment   — the client booked but hasn't uploaded an Interac
--                       e-transfer screenshot yet. Slot is held; no calendar
--                       event or Teams meeting is created until staff accepts.
--   awaiting_review   — proof uploaded; staff must accept or reject. The
--                       end-of-day abandoned-booking cron deliberately
--                       EXCLUDES this status — staff makes the call.
--
-- ALTER TYPE … ADD VALUE cannot be used inside the same transaction that
-- references the new label (Postgres restriction). Splitting the enum
-- change into its own migration file keeps the DML migration in part 2
-- free to reference 'pending_payment' / 'awaiting_review' in CASE clauses
-- and policies without tripping the runner.
-- ============================================================================

ALTER TYPE crm.appointment_status ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE crm.appointment_status ADD VALUE IF NOT EXISTS 'awaiting_review';
