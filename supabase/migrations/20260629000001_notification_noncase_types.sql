-- ============================================================================
-- Non-case notification types
--
-- Adds the enum values used by the appointment + new-lead triggers. Kept in its
-- OWN migration on purpose: Postgres forbids *referring to* a newly added enum
-- value in the same transaction that added it, and the trigger functions in the
-- next migration coerce these literals at CREATE time (check_function_bodies).
-- Splitting the ADD VALUE out lets that transaction commit first.
-- ============================================================================

ALTER TYPE crm.notification_type ADD VALUE IF NOT EXISTS 'appointment_booked';
ALTER TYPE crm.notification_type ADD VALUE IF NOT EXISTS 'new_lead';
