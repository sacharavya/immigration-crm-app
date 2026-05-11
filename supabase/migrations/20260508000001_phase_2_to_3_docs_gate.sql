-- =========================================================================
-- Add a documents-completion gate for Phase 2 → 3 (Documentation → Review).
--
-- Today the case can be advanced to "Review" with zero documents
-- uploaded — the SQL gate only checks retainer + payment (Gate 1) and
-- biometrics payment (Gate 2). Staff (or an auto-advance path) can
-- record the "review_started" milestone before the work is actually
-- ready to be reviewed, leaving the chip strip showing Phase 3 while
-- the document checklist is still 3-of-24 received.
--
-- New Gate 3: leaving 'documentation_in_progress' for
-- 'documentation_review' requires every is_required, unconditional
-- template_document for the case's service_template to have at least
-- one non-rejected, non-superseded upload.
--
-- Conditional template documents (condition_label IS NOT NULL — "if
-- married", "if sponsor in Canada", etc.) are intentionally skipped:
-- their applicability depends on cases.conditional_flags, which is
-- evaluated in app code. Keeping the gate to unconditional required
-- docs catches the realistic miss without trying to re-implement the
-- conditional resolver in SQL.
-- =========================================================================

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

    -- Gate 3: leaving Documentation for Review requires every
    -- unconditional, is_required template_document to have a live,
    -- non-rejected upload on the case.
    IF v_case.status = 'documentation_in_progress'
       AND p_target_status = 'documentation_review' THEN
        SELECT COUNT(*) INTO v_missing
          FROM ref.template_documents td
         WHERE td.service_template_id = v_case.service_template_id
           AND td.is_required = TRUE
           AND td.condition_label IS NULL
           AND NOT EXISTS (
               SELECT 1
                 FROM files.documents fd
                WHERE fd.case_id = p_case_id
                  AND fd.document_code = td.document_code
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
