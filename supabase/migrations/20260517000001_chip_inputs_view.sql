-- ============================================================================
-- FLOW-3a: view that assembles all inputs the action-chip computation needs.
--
-- Pages query this view once and feed each row into computeActionChip() in
-- src/lib/cases/action-chip.ts. The view inherits RLS from the underlying
-- tables (crm.cases, crm.retainer_agreements, crm.case_events, etc.) — no
-- separate policies needed.
--
-- Latest document per (case_id, document_code) determines the "current"
-- upload state. Older versions are ignored; that's what supersedes is for.
-- Required-doc joins use document_code (the can_advance_phase function's
-- template_document_id join is a separate pre-existing bug; tracked as
-- follow-up).
--
-- Latest event is filtered to event types that affect the chip — biometrics,
-- additional-info, interview, application-returned. status_changed and
-- note_added are deliberately excluded so the chip reflects the most recent
-- material change, not a routine timeline entry.
-- ============================================================================

CREATE OR REPLACE VIEW crm.v_case_chip_inputs AS
WITH latest_docs AS (
    SELECT DISTINCT ON (d.case_id, d.document_code)
        d.case_id,
        d.document_code,
        d.status,
        d.reviewed_at,
        d.created_at
      FROM files.documents d
     WHERE d.deleted_at IS NULL
       AND d.case_id IS NOT NULL
       AND d.document_code IS NOT NULL
     ORDER BY d.case_id, d.document_code, d.created_at DESC
)
SELECT
    c.id AS case_id,
    c.status,
    c.biometrics_status,
    c.updated_at,
    c.retainer_minimum_cad,
    c.quoted_fee_cad,
    -- Retainer
    ra.status AS retainer_status,
    ra.sent_at AS retainer_sent_at,
    (ra.first_installment_cad IS NOT NULL
       AND ra.second_installment_cad IS NOT NULL
       AND ra.service_description IS NOT NULL) AS retainer_has_fee_breakdown,
    -- Payments
    COALESCE(crm.case_total_collected(c.id), 0) AS collected_cad,
    -- Documents — required is the master list; uploaded/accepted/rejected
    -- count only docs whose document_code is in the required list.
    (SELECT count(*) FROM crm.case_required_documents
        WHERE case_id = c.id) AS required_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
       WHERE ld.case_id = c.id
         AND ld.status IN ('uploaded', 'under_review', 'accepted')) AS uploaded_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
       WHERE ld.case_id = c.id
         AND ld.status = 'accepted') AS accepted_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
       WHERE ld.case_id = c.id
         AND ld.status = 'rejected') AS rejected_docs,
    (SELECT max(ld.reviewed_at) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
       WHERE ld.case_id = c.id
         AND ld.status = 'rejected') AS last_rejected_at,
    -- Latest material event
    latest_event.event_type AS latest_event_type,
    latest_event.occurred_at AS latest_event_at,
    latest_event.event_data AS latest_event_data
  FROM crm.cases c
  LEFT JOIN crm.retainer_agreements ra
    ON ra.case_id = c.id AND ra.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT event_type, occurred_at, event_data
      FROM crm.case_events
     WHERE case_id = c.id
       AND event_type IN (
           'biometrics_requested',
           'biometrics_scheduled',
           'biometrics_completed',
           'additional_info_requested',
           'additional_info_submitted',
           'interview_scheduled',
           'interview_completed',
           'application_returned'
       )
     ORDER BY occurred_at DESC
     LIMIT 1
  ) latest_event ON TRUE
 WHERE c.deleted_at IS NULL;

GRANT SELECT ON crm.v_case_chip_inputs TO authenticated, service_role;
