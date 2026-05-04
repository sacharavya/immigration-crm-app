-- ============================================================================
-- Backfill: ensure every live case has a retainer_agreements row + every
-- client with a case is marked 'active' instead of 'lead'.
--
-- Why: cases created between RET-1's migration and the createCase patch
-- that auto-creates the retainer never got one, so the case detail
-- Retainer tab renders "Retainer record not found". This migration
-- repairs the gap. Idempotent via the LEFT JOIN guard + status filter,
-- so it's safe to re-run.
--
-- Reversibility: roll back the retainer inserts via
--   DELETE FROM crm.retainer_agreements
--    WHERE status = 'draft'
--      AND signing_token IS NULL
--      AND final_document_id IS NULL
--      AND created_at >= '<this migration's apply time>';
-- The client-status flip can be reverted manually if required.
-- ============================================================================

-- 1. Draft retainer for every case without one. Inserts as 'draft' so
--    the staff Retainer tab shows the right action row immediately.
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

-- 2. Any client who has at least one live case but is still flagged
--    'lead' is promoted to 'active'. New cases trigger this in the
--    createCase action; this catches the historical gap.
UPDATE crm.clients c
SET status = 'active'
WHERE c.status = 'lead'
  AND c.deleted_at IS NULL
  AND EXISTS (
    SELECT 1
      FROM crm.cases ca
     WHERE ca.client_id = c.id
       AND ca.deleted_at IS NULL
  );
