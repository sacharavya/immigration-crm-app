-- ============================================================================
-- APPT-8 part 2 of 2: tables, columns, RPC, and staff_can updates that
-- depend on the new appointment_status values added in part 1.
--
--   - crm.appointments gets 7 columns for the paid flow (fee snapshot,
--     screenshot link, review timestamps, rejection reason, linked payment)
--   - crm.payments gets consultation_payment_nature for the
--     pending/deposit/fee tri-state (null for non-consultation payments)
--   - crm.appointment_slot_is_free counts pending_payment + awaiting_review
--     as conflicts so the slot is genuinely held while review is in flight
--   - crm.staff_can adds 'review_payments' on the rcic + reception
--     allowlists (super_user via ALL, admin via NOT-IN)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- crm.appointments additions
-- ----------------------------------------------------------------------------

ALTER TABLE crm.appointments
    ADD COLUMN IF NOT EXISTS fee_cad_at_booking NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS payment_screenshot_id UUID
        REFERENCES files.documents(id),
    ADD COLUMN IF NOT EXISTS payment_uploaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_reviewed_by UUID REFERENCES crm.staff(id),
    ADD COLUMN IF NOT EXISTS payment_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS linked_payment_id UUID
        REFERENCES crm.payments(id);

COMMENT ON COLUMN crm.appointments.fee_cad_at_booking IS
    'Snapshot of appointment_types.fee_cad at booking time, so a later '
    'price change on the type does not retroactively affect existing bookings.';

COMMENT ON COLUMN crm.appointments.payment_screenshot_id IS
    'The uploaded screenshot of the Interac e-transfer. Null until the '
    'client uploads. Points at a files.documents row stored in the '
    'firm''s OneDrive Consultation Payments folder.';

COMMENT ON COLUMN crm.appointments.linked_payment_id IS
    'The crm.payments row created when staff accepts the payment. Null '
    'while the appointment is pending_payment or awaiting_review.';

-- ----------------------------------------------------------------------------
-- crm.payments addition: consultation outcome tri-state
-- ----------------------------------------------------------------------------

ALTER TABLE crm.payments
    ADD COLUMN IF NOT EXISTS consultation_payment_nature TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.payments'::regclass
           AND conname = 'payments_consultation_payment_nature_check'
    ) THEN
        ALTER TABLE crm.payments
            ADD CONSTRAINT payments_consultation_payment_nature_check
                CHECK (
                    consultation_payment_nature IS NULL
                    OR consultation_payment_nature IN (
                        'pending_decision',
                        'applied_as_deposit',
                        'kept_as_consultation_fee'
                    )
                );
    END IF;
END $$;

COMMENT ON COLUMN crm.payments.consultation_payment_nature IS
    'Tri-state for consultation payments. pending_decision is the default '
    'when staff accepts; flips to applied_as_deposit when the client '
    'retains the firm, or kept_as_consultation_fee when they do not. Null '
    'for non-consultation payments.';

-- ----------------------------------------------------------------------------
-- Overlap function: pending_payment + awaiting_review now count as conflicts
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.appointment_slot_is_free(
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    SELECT count(*) INTO v_conflict_count
    FROM crm.appointments
    WHERE deleted_at IS NULL
      AND status IN ('confirmed', 'pending_payment', 'awaiting_review')
      AND (p_exclude_appointment_id IS NULL OR id <> p_exclude_appointment_id)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at;

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crm.appointment_slot_is_free
    TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- crm.staff_can: add review_payments to RCIC + reception allowlists.
-- Super_user gets it via ALL (catch-all TRUE); admin via NOT-IN (since
-- review_payments isn't in the denied set). Document_officer + readonly
-- intentionally don't get it — they can view payments but not approve
-- consultation proofs.
--
-- Body copied verbatim from 20260528000001_appointments_module.sql with
-- 'review_payments' appended to the rcic + reception IN-lists.
-- ----------------------------------------------------------------------------

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
        RETURN (v_override::text)::boolean;
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
