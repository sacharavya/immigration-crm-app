-- ============================================================================
-- Slot availability must be answered per firm.
-- ============================================================================
--
-- crm.appointment_slot_is_free counted overlapping appointments across the
-- whole table with no tenant predicate. Once two firms share the system that
-- means one firm's 2pm booking marks 2pm as taken for every other firm — each
-- firm's public calendar would slowly be blacked out by strangers.
--
-- p_tenant is added as the FIRST parameter and is required. A default would
-- have been friendlier to existing callers, but "no tenant" has no correct
-- answer here: falling back to counting every firm is precisely the bug.

DROP FUNCTION IF EXISTS crm.appointment_slot_is_free(
    TIMESTAMPTZ, TIMESTAMPTZ, UUID
);

CREATE OR REPLACE FUNCTION crm.appointment_slot_is_free(
    p_tenant UUID,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    IF p_tenant IS NULL THEN
        RAISE EXCEPTION 'appointment_slot_is_free: a tenant is required.';
    END IF;

    SELECT count(*) INTO v_conflict_count
    FROM crm.appointments
    WHERE tenant_id = p_tenant
      AND deleted_at IS NULL
      AND status IN ('confirmed', 'pending_payment', 'awaiting_review')
      AND (p_exclude_appointment_id IS NULL OR id <> p_exclude_appointment_id)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at;

    RETURN v_conflict_count = 0;
END;
$$;
