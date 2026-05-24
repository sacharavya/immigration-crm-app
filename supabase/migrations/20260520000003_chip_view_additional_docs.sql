-- ============================================================================
-- FLOW-3d (3/3): extend crm.v_case_chip_inputs with additional-docs fields.
--
-- additional_docs_requested  — # of crd rows where requested_at_event_id IS NOT NULL
-- additional_docs_uploaded   — # of those with a non-deleted files.documents
--                              row linked via required_document_id in status
--                              uploaded/under_review/accepted
-- additional_docs_accepted   — same but status = 'accepted'
-- additional_docs_latest_due — overall_due_date of the most recent
--                              additional_documents_requested event
-- additional_docs_submitted_after_request — true if an
--                              additional_info_submitted event has occurred
--                              AFTER the most recent
--                              additional_documents_requested event
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
    -- Phase-2 required docs (template-backed; document_code matches via latest_docs)
    (SELECT count(*) FROM crm.case_required_documents
        WHERE case_id = c.id AND requested_at_event_id IS NULL) AS required_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
          AND crd.requested_at_event_id IS NULL
       WHERE ld.case_id = c.id
         AND ld.status IN ('uploaded', 'under_review', 'accepted')) AS uploaded_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
          AND crd.requested_at_event_id IS NULL
       WHERE ld.case_id = c.id
         AND ld.status = 'accepted') AS accepted_docs,
    (SELECT count(*) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
          AND crd.requested_at_event_id IS NULL
       WHERE ld.case_id = c.id
         AND ld.status = 'rejected') AS rejected_docs,
    (SELECT max(ld.reviewed_at) FROM latest_docs ld
        INNER JOIN crm.case_required_documents crd
           ON crd.case_id = ld.case_id
          AND crd.document_code = ld.document_code
          AND crd.requested_at_event_id IS NULL
       WHERE ld.case_id = c.id
         AND ld.status = 'rejected') AS last_rejected_at,
    -- Latest material event
    latest_event.event_type AS latest_event_type,
    latest_event.occurred_at AS latest_event_at,
    latest_event.event_data AS latest_event_data,
    -- Additional docs (ad-hoc IRCC requests; link via required_document_id).
    -- Appended at the end of the view's column list because CREATE OR
    -- REPLACE VIEW can only add new columns, not insert them in the middle.
    (SELECT count(*) FROM crm.case_required_documents
        WHERE case_id = c.id AND requested_at_event_id IS NOT NULL)
      AS additional_docs_requested,
    (SELECT count(DISTINCT crd.id)
       FROM crm.case_required_documents crd
       INNER JOIN files.documents d
          ON d.required_document_id = crd.id
         AND d.deleted_at IS NULL
         AND d.status IN ('uploaded', 'under_review', 'accepted')
       WHERE crd.case_id = c.id
         AND crd.requested_at_event_id IS NOT NULL) AS additional_docs_uploaded,
    (SELECT count(DISTINCT crd.id)
       FROM crm.case_required_documents crd
       INNER JOIN files.documents d
          ON d.required_document_id = crd.id
         AND d.deleted_at IS NULL
         AND d.status = 'accepted'
       WHERE crd.case_id = c.id
         AND crd.requested_at_event_id IS NOT NULL) AS additional_docs_accepted,
    (SELECT max((ce.event_data->>'overall_due_date')::date)
       FROM crm.case_events ce
      WHERE ce.case_id = c.id
        AND ce.event_type = 'additional_documents_requested') AS additional_docs_latest_due,
    (SELECT EXISTS (
        SELECT 1 FROM crm.case_events sub
         WHERE sub.case_id = c.id
           AND sub.event_type = 'additional_info_submitted'
           AND sub.occurred_at > (
             SELECT max(req.occurred_at) FROM crm.case_events req
              WHERE req.case_id = c.id
                AND req.event_type = 'additional_documents_requested'
           )
    )) AS additional_docs_submitted_after_request
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
           'additional_documents_requested',
           'interview_scheduled',
           'interview_completed',
           'application_returned'
       )
     ORDER BY occurred_at DESC
     LIMIT 1
  ) latest_event ON TRUE
 WHERE c.deleted_at IS NULL;

GRANT SELECT ON crm.v_case_chip_inputs TO authenticated, service_role;
