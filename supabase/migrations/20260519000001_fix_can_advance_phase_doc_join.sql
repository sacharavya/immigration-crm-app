-- ============================================================================
-- Fix can_advance_phase: join files.documents <-> case_required_documents on
-- document_code, not template_document_id.
--
-- Pre-existing bug that survived multiple revisions of this function
-- (20260509000001_case_required_documents.sql onward, carried into
-- 20260516000001_flow_1_biometrics_restructure.sql). template_document_id
-- doesn't exist on either table — both share document_code. The SQL applies
-- because Postgres validates references only at call time, so the function
-- only fails when staff hits "Advance phase" from Documents → Review.
--
-- This re-defines the function with the correct join. Signature and return
-- shape unchanged so existing callers (recordEvent server action, app code)
-- keep working.
-- ============================================================================

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

    -- Gate 2: leaving Phase 2 (documentation_in_progress) for Phase 3.
    -- Require: every row in case_required_documents has at least one
    -- non-deleted document with matching document_code in a state that
    -- represents "received" (uploaded, under_review, accepted).
    IF v_case.status = 'documentation_in_progress'
       AND p_target_status = 'documentation_review' THEN

        SELECT count(*) INTO v_required_count
          FROM crm.case_required_documents
         WHERE case_id = p_case_id;

        SELECT count(*) INTO v_uploaded_count
          FROM crm.case_required_documents crd
         WHERE crd.case_id = p_case_id
           AND EXISTS (
               SELECT 1 FROM files.documents d
                WHERE d.case_id = crd.case_id
                  AND d.document_code = crd.document_code
                  AND d.deleted_at IS NULL
                  AND d.status IN ('uploaded', 'under_review', 'accepted')
           );

        IF v_uploaded_count < v_required_count THEN
            RETURN QUERY SELECT FALSE,
                format('All required documents must be uploaded. %s of %s received.',
                       v_uploaded_count::TEXT, v_required_count::TEXT);
            RETURN;
        END IF;
    END IF;

    -- Gate 3: leaving Phase 3 (documentation_review) for Phase 4. Same shape
    -- as Gate 2 but requires status = 'accepted'.
    IF v_case.status = 'documentation_review'
       AND p_target_status = 'submitted_to_ircc' THEN

        SELECT count(*) INTO v_required_count
          FROM crm.case_required_documents
         WHERE case_id = p_case_id;

        SELECT count(*) INTO v_accepted_count
          FROM crm.case_required_documents crd
         WHERE crd.case_id = p_case_id
           AND EXISTS (
               SELECT 1 FROM files.documents d
                WHERE d.case_id = crd.case_id
                  AND d.document_code = crd.document_code
                  AND d.deleted_at IS NULL
                  AND d.status = 'accepted'
           );

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
