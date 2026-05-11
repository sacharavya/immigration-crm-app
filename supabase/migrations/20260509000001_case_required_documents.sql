-- =========================================================================
-- Case-level required documents.
--
-- Drops ref.template_documents.is_required as the source of truth and
-- replaces it with a per-case table. Presence of (case_id,
-- document_code) in crm.case_required_documents = required for that
-- case; absence = optional. Staff toggle the requirement per case in
-- the case-detail Documents tab.
--
-- Backfill preserves current behaviour for in-flight cases: every
-- existing case + unconditional + currently-required template_document
-- gets a row, mirroring what the Phase 2→3 / 3→4 gates counted before.
-- Conditional template docs (condition_label IS NOT NULL) were never
-- counted by the gate, so they aren't backfilled.
--
-- After backfill, the column is dropped and crm.can_advance_phase is
-- redefined to read solely from the new table.
-- =========================================================================

-- 1. Table -----------------------------------------------------------------

CREATE TABLE crm.case_required_documents (
  case_id        UUID NOT NULL REFERENCES crm.cases(id) ON DELETE CASCADE,
  document_code  TEXT NOT NULL,
  set_by         UUID REFERENCES crm.staff(id),
  set_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, document_code)
);

CREATE INDEX idx_case_required_documents_case
  ON crm.case_required_documents(case_id);

COMMENT ON TABLE crm.case_required_documents IS
  'Per-case required-document list. Presence of a row = required; absence = optional. Replaces the old ref.template_documents.is_required flag (template no longer carries required state).';

-- 2. RLS -------------------------------------------------------------------

ALTER TABLE crm.case_required_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_required_docs_read ON crm.case_required_documents
  FOR SELECT USING (crm.staff_can(auth.uid(), 'view_cases'));

CREATE POLICY case_required_docs_write ON crm.case_required_documents
  FOR ALL USING (crm.staff_can(auth.uid(), 'review_documents'));

CREATE POLICY case_required_docs_service_role ON crm.case_required_documents
  FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON crm.case_required_documents TO service_role;

-- 3. Audit trigger ---------------------------------------------------------

CREATE TRIGGER trg_audit_case_required_documents
  AFTER INSERT OR UPDATE OR DELETE ON crm.case_required_documents
  FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- 4. Backfill --------------------------------------------------------------
-- Mirror today's gate behaviour exactly: every (case, unconditional
-- required template_document) pair becomes a row. set_by is the case's
-- creator; set_at matches case creation so the timeline stays sane.

INSERT INTO crm.case_required_documents (case_id, document_code, set_by, set_at)
SELECT c.id, td.document_code, c.created_by, c.created_at
  FROM crm.cases c
  JOIN ref.template_documents td
    ON td.service_template_id = c.service_template_id
 WHERE c.deleted_at IS NULL
   AND td.is_required = TRUE
   AND td.condition_label IS NULL
ON CONFLICT (case_id, document_code) DO NOTHING;

-- 5. Drop the template flag ------------------------------------------------

ALTER TABLE ref.template_documents DROP COLUMN is_required;

-- 6. Redefine the phase gate ----------------------------------------------
-- Gates 2→3 and 3→4 now read crm.case_required_documents directly. No
-- JOIN to template_documents, no condition carve-out (the per-case
-- table is the explicit list — staff opted in to each row).

CREATE OR REPLACE FUNCTION crm.can_advance_phase(
    p_case_id        UUID,
    p_target_status  crm.case_status
) RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
DECLARE
    v_case          RECORD;
    v_retainer      RECORD;
    v_collected     NUMERIC;
    v_retainer_min  NUMERIC;
    v_missing       INTEGER;
BEGIN
    SELECT * INTO v_case
      FROM crm.cases
     WHERE id = p_case_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Case not found';
        RETURN;
    END IF;

    v_collected := crm.case_total_collected(p_case_id);

    -- Gate 1: leaving Phase 1 requires signed retainer + min payment.
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

    -- Gate 3: Phase 2 → 3 requires every per-case required doc to have
    -- a live, non-rejected upload.
    IF v_case.status = 'documentation_in_progress'
       AND p_target_status = 'documentation_review' THEN
        SELECT COUNT(*) INTO v_missing
          FROM crm.case_required_documents cdr
         WHERE cdr.case_id = p_case_id
           AND NOT EXISTS (
               SELECT 1
                 FROM files.documents fd
                WHERE fd.case_id = p_case_id
                  AND fd.document_code = cdr.document_code
                  AND fd.deleted_at IS NULL
                  AND fd.status NOT IN ('rejected', 'superseded')
           );
        IF v_missing > 0 THEN
            RETURN QUERY SELECT FALSE,
                format('Cannot advance to Review: %s required document%s still missing.',
                       v_missing::TEXT,
                       CASE WHEN v_missing = 1 THEN '' ELSE 's' END);
            RETURN;
        END IF;
    END IF;

    -- Gate 4: Phase 3 → 4 requires every per-case required doc to have
    -- at least one accepted upload.
    IF v_case.status = 'documentation_review'
       AND p_target_status = 'submitted_to_ircc' THEN
        SELECT COUNT(*) INTO v_missing
          FROM crm.case_required_documents cdr
         WHERE cdr.case_id = p_case_id
           AND NOT EXISTS (
               SELECT 1
                 FROM files.documents fd
                WHERE fd.case_id = p_case_id
                  AND fd.document_code = cdr.document_code
                  AND fd.deleted_at IS NULL
                  AND fd.status = 'accepted'
           );
        IF v_missing > 0 THEN
            RETURN QUERY SELECT FALSE,
                format('Cannot submit to IRCC: %s required document%s not yet accepted in review.',
                       v_missing::TEXT,
                       CASE WHEN v_missing = 1 THEN '' ELSE 's' END);
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
