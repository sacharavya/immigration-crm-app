-- ============================================================================
-- RLS hardening
--
--   M2  Make crm.staff_can() resilient to a malformed permission_overrides
--       value. permission_overrides is free-form JSONB; if an override is ever
--       written as a non-boolean (a string "true", a number, etc.), the cast
--       (v_override::text)::boolean throws *inside* a SECURITY DEFINER function
--       used in RLS USING/WITH CHECK clauses — which aborts EVERY RLS-protected
--       query for that staffer, locking them out of all reads. Wrap the cast so
--       a bad override degrades to FALSE (deny) instead of an exception.
--
--   M1  Stop read-only staff from forging immutable case_events. The old
--       case_events_insert policy gated INSERT on 'view_cases', which 'readonly'
--       (and 'reception') hold — so a read-only user could INSERT fabricated
--       status-change / fee-collected / IRCC-update events directly via
--       PostgREST. Gate INSERT on actually holding one of the write
--       capabilities that legitimately emit case events. This admits every
--       writer role (incl. reception via create_communications /
--       manage_appointments) and excludes 'readonly', which holds none of them.
--
-- No new permission is introduced (no TS/SQL lock-step needed) — the policy
-- composes existing permissions only.
--
-- The staff_can() body below is copied verbatim from
-- 20260531000004_paid_consult_tables.sql; the ONLY change is the BEGIN/EXCEPTION
-- guard around the override cast.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- M2 — guard the override cast
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.staff_can(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_role TEXT;
    v_overrides JSONB;
    v_override JSONB;
BEGIN
    SELECT role::text, permission_overrides
      INTO v_role, v_overrides
      FROM crm.staff
     WHERE auth_user_id = p_user_id
       AND deleted_at IS NULL
       AND is_active = TRUE
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF p_permission IN (
        'delete_cases',
        'delete_clients',
        'delete_checklists'
    ) THEN
        RETURN v_role = 'super_user';
    END IF;

    v_override := v_overrides -> p_permission;
    IF v_override IS NOT NULL THEN
        -- A malformed (non-boolean) override must deny, not abort the whole
        -- RLS-protected query and lock the user out of every table.
        BEGIN
            RETURN (v_override::text)::boolean;
        EXCEPTION WHEN others THEN
            RETURN FALSE;
        END;
    END IF;

    RETURN CASE v_role
        WHEN 'super_user' THEN TRUE
        WHEN 'admin' THEN p_permission NOT IN (
            'manage_super_users',
            'manage_admins',
            'change_system_settings'
        )
        WHEN 'rcic' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'advance_phase',
            'view_clients', 'create_clients', 'edit_clients',
            'view_documents', 'upload_documents', 'review_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_financials', 'record_payments', 'edit_invoices',
            'view_intake_form', 'edit_intake_form',
            'manage_templates',
            'manage_appointments',
            'review_payments'
        )
        WHEN 'document_officer' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'view_clients', 'edit_clients',
            'view_documents', 'upload_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_intake_form', 'edit_intake_form'
        )
        WHEN 'reception' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients', 'create_clients',
            'view_communications', 'create_communications',
            'view_tasks',
            'manage_appointments',
            'review_payments'
        )
        WHEN 'readonly' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients',
            'view_documents',
            'view_communications',
            'view_tasks',
            'view_financials',
            'view_intake_form'
        )
        ELSE FALSE
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.staff_can(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- M1 — case_events INSERT requires a write capability, not just view_cases
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS case_events_insert ON crm.case_events;

-- Any staff who can perform a case-mutating action may append the matching
-- event. The action itself is still gated by its own permission at the
-- server-action / table-policy layer; this only ensures the *event writer*
-- holds some write capability. 'readonly' holds none of these, so it can no
-- longer fabricate audit-trail events directly via PostgREST.
CREATE POLICY case_events_insert ON crm.case_events
    FOR INSERT
    WITH CHECK (
        crm.staff_can(auth.uid(), 'edit_cases')
        OR crm.staff_can(auth.uid(), 'advance_phase')
        OR crm.staff_can(auth.uid(), 'record_payments')
        OR crm.staff_can(auth.uid(), 'upload_documents')
        OR crm.staff_can(auth.uid(), 'create_communications')
        OR crm.staff_can(auth.uid(), 'manage_appointments')
    );
