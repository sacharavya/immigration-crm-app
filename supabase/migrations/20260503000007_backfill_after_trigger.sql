-- ============================================================================
-- One-shot repair for cases inserted between the previous backfill
-- (20260503000004) and the trigger (20260503000006). The LEFT JOIN
-- guard makes it idempotent — no duplicates if all cases already have
-- their retainer.
-- ============================================================================

INSERT INTO crm.retainer_agreements (case_id, status, created_by, created_at)
SELECT
    c.id,
    'draft'::crm.retainer_agreement_status,
    c.created_by,
    c.created_at
FROM crm.cases c
LEFT JOIN crm.retainer_agreements ra
    ON ra.case_id = c.id AND ra.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND ra.id IS NULL;
