-- ============================================================================
-- RET-1: Retainer agreements schema.
--
-- - Renames the Phase 1 case_status value from 'retainer_signed' to
--   'retainer_pending'. Existing rows update automatically. TypeScript
--   code that references the old name will fail to compile until RET-2
--   replaces 'retainer_signed' with 'retainer_pending' in app code.
--
-- - Adds 6 new event_type values for retainer lifecycle tracking. Note
--   that 'retainer_signed' is RE-ADDED here as an EVENT TYPE; this is a
--   distinct concept from the old case_status value. Going forward,
--   'retainer_signed' means "the retainer was signed" (event), and
--   'retainer_pending' means "the case is in Phase 1" (status).
--
-- - Adds signature columns on crm.staff so RCICs can countersign
--   agreements via image overlay or live drawn signature.
--
-- - Creates crm.retainer_agreements (one per case, FK CASCADE) plus
--   the supporting enums retainer_agreement_status and retainer_method.
--
-- - Updates crm.can_advance_phase: leaving Phase 1 now requires both a
--   signed/uploaded retainer AND the retainer minimum payment. Existing
--   cases without a retainer record (see PART M) will be blocked at
--   the gate until staff upload a scanned copy or void and recreate.
--
-- - Adds three new permissions to crm.staff_can(): 'manage_retainers',
--   'void_retainers', 'manage_own_signature'. Granted to super_user,
--   admin (auto, via NOT IN guard), and rcic. Document Officers and
--   Reception staff don't have a signature on file and can't author
--   retainers.
--
-- - RLS: SELECT for any signed-in staff; FOR ALL gated by
--   manage_retainers. The public signing page bypasses RLS by acting
--   as service_role (token validation lives in the server action).
--
-- Reversibility: rename the case_status value back, drop the new
-- table/columns/types, and revert the function bodies. The PART M
-- placeholder INSERT can be reverted via:
--   DELETE FROM crm.retainer_agreements
--    WHERE final_document_id IS NULL AND status = 'pending_signature';
-- ============================================================================


-- PART A: Rename the Phase 1 case_status value -----------------------------

ALTER TYPE crm.case_status RENAME VALUE 'retainer_signed' TO 'retainer_pending';


-- PART B: Add new event types ----------------------------------------------

ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_prepared';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_sent';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_signed';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_voided';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_uploaded';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'retainer_resent';


-- PART C: Signature columns on crm.staff -----------------------------------

ALTER TABLE crm.staff
    ADD COLUMN IF NOT EXISTS signature_image_url        TEXT,
    ADD COLUMN IF NOT EXISTS signature_image_set_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS printed_name_for_signature TEXT,
    ADD COLUMN IF NOT EXISTS signature_capture_method   TEXT
        CHECK (signature_capture_method IS NULL
               OR signature_capture_method IN ('drawn', 'uploaded'));


-- PART D + E: New enums -----------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retainer_agreement_status') THEN
        CREATE TYPE crm.retainer_agreement_status AS ENUM (
            'draft',
            'pending_signature',
            'signed',
            'uploaded',
            'void',
            'expired'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'retainer_method') THEN
        CREATE TYPE crm.retainer_method AS ENUM (
            'online_signature',
            'signature_image_overlay',
            'scanned_upload'
        );
    END IF;
END $$;


-- PART F: crm.retainer_agreements ------------------------------------------

CREATE TABLE IF NOT EXISTS crm.retainer_agreements (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                       UUID NOT NULL UNIQUE
                                    REFERENCES crm.cases(id) ON DELETE CASCADE,
    status                        crm.retainer_agreement_status NOT NULL
                                    DEFAULT 'draft',
    method                        crm.retainer_method,

    -- Token for the public signing page
    signing_token                 TEXT UNIQUE,
    token_expires_at              TIMESTAMPTZ,

    -- Send tracking
    sent_to_email                 TEXT,
    sent_to_phone                 TEXT,
    sent_at                       TIMESTAMPTZ,
    resent_count                  INT NOT NULL DEFAULT 0,
    last_resent_at                TIMESTAMPTZ,

    -- Signing event
    signed_at                     TIMESTAMPTZ,
    signed_ip_address             INET,
    signed_user_agent             TEXT,
    client_signature_image_url    TEXT,
    final_document_id             UUID REFERENCES files.documents(id),

    -- Snapshots from the case at signing time
    quoted_fee_cad_at_signing     NUMERIC(10,2),
    government_fee_cad            NUMERIC(10,2),
    first_installment_cad         NUMERIC(10,2),
    second_installment_cad        NUMERIC(10,2),
    hst_cad                       NUMERIC(10,2),
    withdrawal_refund_floor_cad   NUMERIC(10,2),
    service_description           TEXT,

    -- Signing party (staff)
    signed_by_staff_id            UUID REFERENCES crm.staff(id),
    template_version              TEXT NOT NULL DEFAULT 'v1',
    notes                         TEXT,

    -- Void tracking
    void_reason                   TEXT,
    voided_at                     TIMESTAMPTZ,
    voided_by                     UUID REFERENCES crm.staff(id),

    -- Standard audit
    created_by                    UUID REFERENCES crm.staff(id),
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_retainer_case
    ON crm.retainer_agreements(case_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_retainer_token
    ON crm.retainer_agreements(signing_token)
    WHERE signing_token IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_retainer_status
    ON crm.retainer_agreements(status)
    WHERE deleted_at IS NULL;


-- PART G: updated_at trigger ------------------------------------------------

DROP TRIGGER IF EXISTS trg_updated_retainer_agreements ON crm.retainer_agreements;
CREATE TRIGGER trg_updated_retainer_agreements
    BEFORE UPDATE ON crm.retainer_agreements
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();


-- PART H: audit trigger -----------------------------------------------------

DROP TRIGGER IF EXISTS trg_audit_retainer_agreements ON crm.retainer_agreements;
CREATE TRIGGER trg_audit_retainer_agreements
    AFTER INSERT OR UPDATE OR DELETE ON crm.retainer_agreements
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();


-- PART I: phase-advance gate now requires a signed retainer ----------------
--
-- Adds gate 1a (retainer must be signed/uploaded) ahead of the existing
-- gate 1b (retainer minimum payment received). Both must pass to leave
-- 'retainer_pending'. Gate 2 (full payment before biometrics) unchanged.

CREATE OR REPLACE FUNCTION crm.can_advance_phase(
    p_case_id        UUID,
    p_target_status  crm.case_status
) RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
    v_case          RECORD;
    v_retainer      RECORD;
    v_collected     NUMERIC;
    v_retainer_min  NUMERIC;
BEGIN
    SELECT * INTO v_case
      FROM crm.cases
     WHERE id = p_case_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Case not found';
        RETURN;
    END IF;

    v_collected := crm.case_total_collected(p_case_id);

    -- Gate 1a + 1b: leaving Phase 1 requires signed retainer + payment.
    IF v_case.status = 'retainer_pending'
       AND p_target_status <> 'retainer_pending' THEN
        SELECT * INTO v_retainer
          FROM crm.retainer_agreements
         WHERE case_id = p_case_id AND deleted_at IS NULL;

        IF NOT FOUND OR v_retainer.status NOT IN ('signed', 'uploaded') THEN
            RETURN QUERY SELECT FALSE,
                'Retainer must be signed before advancing.';
            RETURN;
        END IF;

        v_retainer_min := COALESCE(v_case.retainer_minimum_cad, 0.01);
        IF v_collected < v_retainer_min THEN
            RETURN QUERY SELECT FALSE,
                format('Retainer payment required before advancing. Received %s of %s CAD.',
                       v_collected::TEXT, v_retainer_min::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 2: leaving Phase 4 for biometrics requires full payment.
    IF v_case.status = 'submitted_to_ircc'
       AND p_target_status IN ('biometrics_pending',
                               'biometrics_completed',
                               'awaiting_decision') THEN
        IF v_collected < v_case.quoted_fee_cad THEN
            RETURN QUERY SELECT FALSE,
                format('Full payment required before biometrics. Outstanding: %s CAD.',
                       (v_case.quoted_fee_cad - v_collected)::TEXT);
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- PART J: RLS policies ------------------------------------------------------

ALTER TABLE crm.retainer_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_read_retainers     ON crm.retainer_agreements;
DROP POLICY IF EXISTS staff_manage_retainers   ON crm.retainer_agreements;
DROP POLICY IF EXISTS service_role_retainers   ON crm.retainer_agreements;

CREATE POLICY staff_read_retainers ON crm.retainer_agreements
    FOR SELECT
    USING (crm.current_staff_role() IS NOT NULL);

CREATE POLICY staff_manage_retainers ON crm.retainer_agreements
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_retainers'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_retainers'));

CREATE POLICY service_role_retainers ON crm.retainer_agreements
    FOR ALL TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);


-- PART K: extend crm.staff_can() with the three new permissions ------------
--
-- super_user already returns TRUE for everything; admin already returns
-- TRUE for anything not in the deny list. Only the rcic IN-clause needs
-- an explicit addition. Document Officers and Reception are unchanged
-- (they don't get retainer or signature management).

CREATE OR REPLACE FUNCTION crm.staff_can(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_role      TEXT;
    v_overrides JSONB;
    v_override  JSONB;
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

    -- Non-overridable destructive permissions: jump straight to the role
    -- map. Any value in permission_overrides is ignored.
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
            -- RET-1 additions:
            'manage_retainers', 'void_retainers', 'manage_own_signature'
        )
        WHEN 'document_officer' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'view_clients', 'edit_clients',
            'view_documents', 'upload_documents', 'review_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_intake_form', 'edit_intake_form'
        )
        WHEN 'reception' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients', 'create_clients',
            'view_communications', 'create_communications',
            'view_tasks'
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


-- PART L: service_role grants ----------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE
    ON crm.retainer_agreements TO service_role;


-- PART M: backfill placeholder retainers for existing cases ----------------
--
-- Existing cases without a retainer record will block at gate 1a. Insert
-- a 'pending_signature' row so staff can either upload a scanned signed
-- copy via the Retainer tab, or void and recreate. Idempotent via the
-- LEFT JOIN guard.

INSERT INTO crm.retainer_agreements (case_id, status, created_by, created_at)
SELECT
    c.id,
    'pending_signature'::crm.retainer_agreement_status,
    c.created_by,
    c.created_at
FROM crm.cases c
LEFT JOIN crm.retainer_agreements ra ON ra.case_id = c.id
WHERE c.deleted_at IS NULL
  AND ra.id IS NULL;
