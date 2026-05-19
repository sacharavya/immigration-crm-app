-- ============================================================================
-- FLOW-1: Restructure the case status enum + add biometric records
--
-- Drops biometrics-related case statuses (biometrics_pending,
-- biometrics_completed, awaiting_decision, additional_info_requested)
-- because not every case has biometrics and the firm now tracks biometrics
-- at the client level. Adds:
--   - new event types to cover IRCC interactions
--   - crm.client_biometric_records (client-scoped history)
--   - crm.clients.has_prior_biometrics (yes/no/null intake gate)
--   - crm.biometrics_status enum + crm.cases.biometrics_status column
--   - crm.cases.biometrics_record_id FK
--
-- TypeScript regen happens after this migration. Expected compile errors
-- in app code that hard-codes the dropped statuses — fixed in FLOW-2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Pre-flight guard. Refuse to migrate if any non-deleted case is still in a
-- to-be-dropped status. Pre-flight observation said this is empty in prod;
-- the guard makes that promise enforceable in any environment.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count
    FROM crm.cases
   WHERE status::text IN ('biometrics_pending', 'biometrics_completed',
                          'awaiting_decision', 'additional_info_requested')
     AND deleted_at IS NULL;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot run FLOW-1: % cases in dropped statuses. Manual remap required first.', v_count;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- PART A. New event_type values. ADD VALUE IF NOT EXISTS keeps this safe to
-- re-run; the migration doesn't reference the new values, so PG's
-- "added-in-this-tx" restriction doesn't apply.
-- ----------------------------------------------------------------------------
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'biometrics_requested';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'biometrics_scheduled';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'biometrics_completed';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'additional_info_requested';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'additional_info_submitted';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'interview_scheduled';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'interview_completed';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'application_returned';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'appeal_filed';
ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'withdrawal_requested';


-- ----------------------------------------------------------------------------
-- PART B. Swap crm.case_status to the 7-value enum.
--
-- PostgreSQL can't DROP VALUE from an enum, so the canonical pattern is:
--   1. Drop functions that depend on the type
--   2. Drop the column default (it's typed against the enum)
--   3. RENAME the old type, CREATE the new one
--   4. ALTER COLUMN ... TYPE ... USING (cast through text — safe because the
--      pre-flight guard guarantees every row maps to a kept value)
--   5. Re-establish the default
--   6. DROP the old type
--   7. Recreate the dependent functions with the new enum
--
-- Wrapped in a DO block guarded on the presence of 'biometrics_pending' so a
-- re-run after success is a no-op rather than an error.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'crm.case_status'::regtype
      AND enumlabel = 'biometrics_pending'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS crm.phase_of(crm.case_status)';
    EXECUTE 'DROP FUNCTION IF EXISTS crm.can_advance_phase(UUID, crm.case_status)';

    EXECUTE 'ALTER TABLE crm.cases ALTER COLUMN status DROP DEFAULT';
    EXECUTE 'ALTER TYPE crm.case_status RENAME TO case_status_old';

    EXECUTE $ddl$
      CREATE TYPE crm.case_status AS ENUM (
        'retainer_pending',
        'documentation_in_progress',
        'documentation_review',
        'submitted_to_ircc',
        'passport_requested',
        'refused',
        'closed'
      )
    $ddl$;

    EXECUTE 'ALTER TABLE crm.cases ALTER COLUMN status TYPE crm.case_status USING status::text::crm.case_status';
    EXECUTE 'ALTER TABLE crm.cases ALTER COLUMN status SET DEFAULT ''retainer_pending''';

    EXECUTE 'DROP TYPE crm.case_status_old';
  END IF;
END $$;


-- Recreate crm.phase_of for the slimmer enum. Biometrics is no longer a
-- phase; the remaining 5 phases are Retainer / Documents / Review /
-- Submitted / Decision (passport_requested + refused).
CREATE OR REPLACE FUNCTION crm.phase_of(status crm.case_status) RETURNS TEXT AS $$
    SELECT CASE status
        WHEN 'retainer_pending'          THEN '1_retainer'
        WHEN 'documentation_in_progress' THEN '2_documentation'
        WHEN 'documentation_review'      THEN '3_review'
        WHEN 'submitted_to_ircc'         THEN '4_submitted'
        WHEN 'passport_requested'        THEN '5_decision'
        WHEN 'refused'                   THEN '5_decision'
        WHEN 'closed'                    THEN 'closed'
    END;
$$ LANGUAGE SQL IMMUTABLE;


-- Recreate crm.can_advance_phase. Body matches PART F of the spec verbatim.
-- Biometrics gate removed; Gate 4 (Phase 4 -> Decision) requires full
-- payment because submitted -> decision is the recording of an outcome.
CREATE OR REPLACE FUNCTION crm.can_advance_phase(
    p_case_id        UUID,
    p_target_status  crm.case_status
) RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
    v_case            RECORD;
    v_retainer        RECORD;
    v_collected       NUMERIC;
    v_retainer_min    NUMERIC;
    v_required_count  INT;
    v_uploaded_count  INT;
    v_accepted_count  INT;
BEGIN
    SELECT * INTO v_case FROM crm.cases
     WHERE id = p_case_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Case not found';
        RETURN;
    END IF;

    v_collected := crm.case_total_collected(p_case_id);

    -- Gate 1: leaving Phase 1 (retainer_pending) for Phase 2
    IF v_case.status = 'retainer_pending'
       AND p_target_status = 'documentation_in_progress' THEN

        SELECT * INTO v_retainer FROM crm.retainer_agreements
         WHERE case_id = p_case_id AND deleted_at IS NULL;

        IF NOT FOUND OR v_retainer.status NOT IN ('signed', 'uploaded') THEN
            RETURN QUERY SELECT FALSE,
                'Retainer must be signed before advancing.';
            RETURN;
        END IF;

        v_retainer_min := COALESCE(v_case.retainer_minimum_cad, 0.01);
        IF v_collected < v_retainer_min THEN
            RETURN QUERY SELECT FALSE,
                format('Retainer payment required. Received %s of %s CAD.',
                       v_collected::TEXT, v_retainer_min::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 2: leaving Phase 2 (documentation_in_progress) for Phase 3
    IF v_case.status = 'documentation_in_progress'
       AND p_target_status = 'documentation_review' THEN

        SELECT count(*) INTO v_required_count
          FROM crm.case_required_documents
         WHERE case_id = p_case_id;

        SELECT count(DISTINCT crd.id) INTO v_uploaded_count
          FROM crm.case_required_documents crd
         INNER JOIN files.documents d ON d.case_id = crd.case_id
          AND d.template_document_id = crd.template_document_id
          AND d.deleted_at IS NULL
          AND d.status IN ('uploaded', 'accepted')
         WHERE crd.case_id = p_case_id;

        IF v_uploaded_count < v_required_count THEN
            RETURN QUERY SELECT FALSE,
                format('All required documents must be uploaded. %s of %s received.',
                       v_uploaded_count::TEXT, v_required_count::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 3: leaving Phase 3 (documentation_review) for Phase 4
    IF v_case.status = 'documentation_review'
       AND p_target_status = 'submitted_to_ircc' THEN

        SELECT count(*) INTO v_required_count
          FROM crm.case_required_documents
         WHERE case_id = p_case_id;

        SELECT count(DISTINCT crd.id) INTO v_accepted_count
          FROM crm.case_required_documents crd
         INNER JOIN files.documents d ON d.case_id = crd.case_id
          AND d.template_document_id = crd.template_document_id
          AND d.deleted_at IS NULL
          AND d.status = 'accepted'
         WHERE crd.case_id = p_case_id;

        IF v_accepted_count < v_required_count THEN
            RETURN QUERY SELECT FALSE,
                format('All required documents must be accepted by the reviewer. %s of %s accepted.',
                       v_accepted_count::TEXT, v_required_count::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 4: leaving Phase 4 (submitted_to_ircc) for Decision requires
    -- full payment. submitted -> decision is recording an IRCC outcome.
    IF v_case.status = 'submitted_to_ircc'
       AND p_target_status IN ('passport_requested', 'refused') THEN
        IF v_collected < v_case.quoted_fee_cad THEN
            RETURN QUERY SELECT FALSE,
                format('Full payment required before recording decision. Outstanding: %s CAD.',
                       (v_case.quoted_fee_cad - v_collected)::TEXT);
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- PART C. Client-scoped biometric history.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm.client_biometric_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id             UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,

    date_given            DATE NOT NULL,
    location              TEXT,
    biometrics_type       TEXT DEFAULT 'Fingerprints + Photo',
    bvn_or_reference      TEXT,
    application_context   TEXT,
    valid_until           DATE,
    notes                 TEXT,

    display_order         INT NOT NULL DEFAULT 100,
    created_by            UUID REFERENCES crm.staff(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_biometric_records_client
    ON crm.client_biometric_records(client_id)
    WHERE deleted_at IS NULL;

ALTER TABLE crm.client_biometric_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_read_biometrics ON crm.client_biometric_records;
CREATE POLICY staff_read_biometrics ON crm.client_biometric_records
    FOR SELECT USING (crm.current_staff_role() IS NOT NULL);

DROP POLICY IF EXISTS staff_manage_biometrics ON crm.client_biometric_records;
CREATE POLICY staff_manage_biometrics ON crm.client_biometric_records
    FOR ALL USING (crm.staff_can(auth.uid(), 'edit_clients'));

GRANT SELECT, INSERT, UPDATE, DELETE
    ON crm.client_biometric_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON crm.client_biometric_records TO authenticated;

DROP TRIGGER IF EXISTS trg_updated_biometric_records ON crm.client_biometric_records;
CREATE TRIGGER trg_updated_biometric_records
    BEFORE UPDATE ON crm.client_biometric_records
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_biometric_records ON crm.client_biometric_records;
CREATE TRIGGER trg_audit_biometric_records
    AFTER INSERT OR UPDATE OR DELETE ON crm.client_biometric_records
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();


-- ----------------------------------------------------------------------------
-- PART D. Client-level prior-biometrics gate.
-- ----------------------------------------------------------------------------
ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS has_prior_biometrics BOOLEAN;

COMMENT ON COLUMN crm.clients.has_prior_biometrics IS
    'Yes/No/null gate question for the intake form biometrics section. Null means unanswered.';


-- ----------------------------------------------------------------------------
-- PART E. Per-case biometrics status (independent of the phase pipeline).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'biometrics_status' AND typnamespace = 'crm'::regnamespace) THEN
    CREATE TYPE crm.biometrics_status AS ENUM (
        'not_applicable',
        'previously_given_valid',
        'previously_given_expired',
        'pending',
        'requested_by_ircc',
        'scheduled',
        'completed',
        'exempt'
    );
  END IF;
END $$;

ALTER TABLE crm.cases
    ADD COLUMN IF NOT EXISTS biometrics_status crm.biometrics_status
        NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS biometrics_record_id UUID
        REFERENCES crm.client_biometric_records(id);

COMMENT ON COLUMN crm.cases.biometrics_status IS
    'The biometrics situation for this case. Independent of the case phase.';

COMMENT ON COLUMN crm.cases.biometrics_record_id IS
    'Optional reference to the biometric record this case relies on. Used when status is previously_given_valid.';

CREATE INDEX IF NOT EXISTS idx_cases_biometrics_status
    ON crm.cases(biometrics_status)
    WHERE deleted_at IS NULL;
