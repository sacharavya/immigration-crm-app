-- ============================================================================
-- Backfill crm.clients.immigration_status from approved cases.
--
-- The worklist, case header, and client profile all read the client's stored
-- immigration_status. It is auto-populated on approval, but only for service
-- types whose code/category mapped to a status, so earlier approvals (and any
-- custom service types) left the field NULL. This backfills it so a client with
-- an approved case reads consistently everywhere.
--
-- Rules (matching immigrationStatusFromServiceType in TS):
--   * Approved decisions only. A refusal grants no status.
--   * Prefer the service type's category_code (the firm's immigration bucket),
--     with a few aliases; fall back to the legacy uppercase code map.
--   * Only fill rows where immigration_status IS NULL. Idempotent and
--     non-destructive: a manually entered status is never overwritten.
--   * Expiry is left untouched (set only when entered).
-- ============================================================================

WITH approvals AS (
    -- Most recent approval per client, whether the case is still at
    -- passport_requested or was later closed (caught via the decision event).
    SELECT DISTINCT ON (ca.client_id)
        ca.client_id,
        st.code          AS svc_code,
        st.category_code AS svc_category
    FROM crm.cases ca
    JOIN ref.service_types st ON st.id = ca.service_type_id
    LEFT JOIN LATERAL (
        SELECT max(ce.occurred_at) AS approved_at
        FROM crm.case_events ce
        WHERE ce.case_id = ca.id
          AND ce.event_data->>'milestone' = 'decision_approved'
    ) ev ON true
    WHERE ca.deleted_at IS NULL
      AND (ca.status = 'passport_requested' OR ev.approved_at IS NOT NULL)
    ORDER BY ca.client_id,
             COALESCE(ca.decided_at, ev.approved_at, ca.updated_at) DESC
),
mapped AS (
    SELECT
        client_id,
        CASE
            WHEN svc_category = 'citizenship' THEN 'citizen'
            WHEN svc_category IN ('pr', 'permanent_residence') THEN 'permanent_resident'
            WHEN svc_category IS NOT NULL AND svc_category <> '' THEN svc_category
            -- Legacy uppercase code fallback (seeded service types).
            WHEN svc_code = 'PGWP' THEN 'pgwp'
            WHEN svc_code = 'STUDY_PERMIT' THEN 'study_permit'
            WHEN svc_code = 'WORK_PERMIT_OPEN' THEN 'work_permit'
            WHEN svc_code = 'WORK_PERMIT_LMIA' THEN 'work_permit'
            WHEN svc_code = 'VISITOR_VISA' THEN 'visitor'
            WHEN svc_code = 'VISITOR_RECORD' THEN 'visitor_record'
            WHEN svc_code = 'PR_EXPRESS' THEN 'permanent_resident'
            WHEN svc_code = 'PR_PNP' THEN 'permanent_resident'
            WHEN svc_code = 'CITIZENSHIP' THEN 'citizen'
            WHEN svc_code = 'SPONSORSHIP' THEN 'work_permit'
            WHEN svc_code = 'BRIDGING_OWP' THEN 'bridging_owp'
            ELSE NULL
        END AS status_text
    FROM approvals
)
UPDATE crm.clients c
SET immigration_status = m.status_text::crm.immigration_status_type
FROM mapped m
WHERE c.id = m.client_id
  AND c.immigration_status IS NULL
  AND c.deleted_at IS NULL
  AND m.status_text IS NOT NULL
  -- Guard the cast: only assign values that exist in the enum.
  AND m.status_text = ANY (enum_range(NULL::crm.immigration_status_type)::text[]);
