-- ----------------------------------------------------------------------------
-- Security hardening: override key-set guard in staff_can() + money-table writes
--
-- Two defence-in-depth fixes that close an RLS privilege-escalation path. These
-- complement migration 20260624000003 (which added the M2 malformed-cast guard
-- and the M1 case_events-insert tightening); both of those are preserved here.
--
-- SEC-C1  crm.staff_can() previously honored a permission_overrides entry for
--         EVERY permission except the three deletes. Combined with the fact
--         that an admin can write any crm.staff row, that let an override for
--         a non-overridable permission (e.g. record_payments) grant DB-level
--         authority the app layer never intended. The override branch is now
--         restricted to the same set as PERMISSION_OVERRIDABLE in
--         src/lib/auth/permissions.ts (view_financials, export_data,
--         review_documents). Any other key in the JSONB is ignored. The M2
--         malformed-cast guard from 20260624000003 is kept inside the branch.
--
-- SEC-H1  crm.payments / crm.invoices / crm.invoice_line_items used a single
--         `FOR ALL USING (staff_can('view_financials'))` policy (money_*) with
--         no WITH CHECK, so the read permission (held by readonly, and per-staff
--         overridable) also granted INSERT/UPDATE/DELETE. Writes are now gated
--         on the granular write permissions while SELECT stays on
--         view_financials. Read access is unchanged.
--
-- Behaviour preserved: every regular-client writer already holds the required
-- write permission today —
--   * crm.payments  : recordPayment (record_payments), attach/removePaymentProof
--                      (record_payments), payments page nature/void
--                      (review_payments). Hence writes allow
--                      record_payments OR review_payments.
--   * crm.invoices / invoice_line_items: no regular-client writer exists; the
--                      only writers are service-role (RLS-bypassing) paths, so
--                      edit_invoices is the correct guard for any future
--                      authenticated writer.
-- Service-role flows (acceptAppointmentPayment, pay/[token] portal) bypass RLS
-- and are unaffected by these policies.
-- ----------------------------------------------------------------------------

-- 1. SEC-C1 — restrict the override branch to the overridable permissions only,
--    keeping the M2 malformed-cast guard from 20260624000003.
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

    -- SEC-C1: only the overridable permissions may be flipped per-staff. Any
    -- other key in permission_overrides is ignored so a stray or forged
    -- override cannot escalate via RLS. Mirrors PERMISSION_OVERRIDABLE in
    -- src/lib/auth/permissions.ts — keep the two lists in sync.
    IF p_permission IN (
        'view_financials',
        'export_data',
        'review_documents'
    ) THEN
        v_override := v_overrides -> p_permission;
        IF v_override IS NOT NULL THEN
            -- M2: a malformed (non-boolean) override must deny, not abort the
            -- whole RLS-protected query and lock the user out of every table.
            BEGIN
                RETURN (v_override::text)::boolean;
            EXCEPTION WHEN others THEN
                RETURN FALSE;
            END;
        END IF;
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

-- 2. SEC-H1 — split the money-table policies so SELECT stays on view_financials
--    but writes require the granular write permissions. Replaces the single
--    money_* FOR ALL policies created in 20260501000003_user_management.sql.

-- crm.payments: writes allowed for record_payments OR review_payments.
DROP POLICY IF EXISTS money_payments ON crm.payments;

CREATE POLICY payments_select ON crm.payments
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_financials'));

CREATE POLICY payments_insert ON crm.payments
    FOR INSERT
    WITH CHECK (
        crm.staff_can(auth.uid(), 'record_payments')
        OR crm.staff_can(auth.uid(), 'review_payments')
    );

CREATE POLICY payments_update ON crm.payments
    FOR UPDATE
    USING (
        crm.staff_can(auth.uid(), 'record_payments')
        OR crm.staff_can(auth.uid(), 'review_payments')
    )
    WITH CHECK (
        crm.staff_can(auth.uid(), 'record_payments')
        OR crm.staff_can(auth.uid(), 'review_payments')
    );

CREATE POLICY payments_delete ON crm.payments
    FOR DELETE
    USING (
        crm.staff_can(auth.uid(), 'record_payments')
        OR crm.staff_can(auth.uid(), 'review_payments')
    );

-- crm.invoices: writes require edit_invoices.
DROP POLICY IF EXISTS money_invoices ON crm.invoices;

CREATE POLICY invoices_select ON crm.invoices
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_financials'));

CREATE POLICY invoices_insert ON crm.invoices
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_invoices'));

CREATE POLICY invoices_update ON crm.invoices
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'edit_invoices'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_invoices'));

CREATE POLICY invoices_delete ON crm.invoices
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'edit_invoices'));

-- crm.invoice_line_items: writes require edit_invoices.
DROP POLICY IF EXISTS money_invoice_lines ON crm.invoice_line_items;

CREATE POLICY invoice_lines_select ON crm.invoice_line_items
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_financials'));

CREATE POLICY invoice_lines_insert ON crm.invoice_line_items
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_invoices'));

CREATE POLICY invoice_lines_update ON crm.invoice_line_items
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'edit_invoices'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_invoices'));

CREATE POLICY invoice_lines_delete ON crm.invoice_line_items
    FOR DELETE
    USING (crm.staff_can(auth.uid(), 'edit_invoices'));
