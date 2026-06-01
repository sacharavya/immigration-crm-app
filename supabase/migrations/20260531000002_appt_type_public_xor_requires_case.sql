-- ============================================================================
-- APPT-7: prevent the broken state where an appointment type is both
-- is_public = TRUE (offered on /book) AND requires_case = TRUE (cannot be
-- booked without a linked case). The public booking flow has no concept of
-- linking to a case — pre-existing seeded data already respects this; the
-- constraint blocks the state going forward.
--
-- If a row currently violates the constraint, the migration would fail with
-- "check constraint ... is violated by some row". Defensive remediation
-- below: for any conflicting row, KEEP is_public=true and flip
-- requires_case=false. Rationale — a public type that can't be booked from
-- the public page is the broken state; making it bookable preserves value.
-- If the firm wants a truly internal type instead, they can flip is_public
-- off via the Types UI after this lands.
-- ============================================================================

UPDATE crm.appointment_types
   SET requires_case = false
 WHERE is_public = true
   AND requires_case = true;

ALTER TABLE crm.appointment_types
    ADD CONSTRAINT appt_type_public_xor_requires_case
    CHECK (NOT (is_public = true AND requires_case = true));
