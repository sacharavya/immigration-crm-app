-- ============================================================================
-- Trigger: every new case row automatically gets a draft retainer.
--
-- The createCase server action used to do this client-side, but the
-- INSERT depended on app-code correctness + RLS pass-through, so a hot
-- reload glitch or a missed import could (and did) leave new cases
-- orphaned. Moving the invariant to the database makes "every case has
-- a retainer" non-negotiable regardless of which code path inserted
-- the case.
--
-- SECURITY DEFINER lets the trigger bypass RLS on retainer_agreements
-- so it works even when the caller doesn't have manage_retainers (e.g.
-- a paralegal creating a case). The retainer always lands as 'draft';
-- staff fill in details + send via the case detail Retainer tab.
--
-- ON CONFLICT (case_id) DO NOTHING makes the trigger safe alongside
-- the existing backfill (20260503000004) and any app-side INSERTs that
-- haven't been removed yet — no duplicate rows can sneak in.
-- ============================================================================

CREATE OR REPLACE FUNCTION crm.ensure_retainer_for_new_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO crm.retainer_agreements (case_id, status, created_by)
    VALUES (
        NEW.id,
        'draft'::crm.retainer_agreement_status,
        NEW.created_by
    )
    ON CONFLICT (case_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_retainer_for_new_case ON crm.cases;
CREATE TRIGGER trg_ensure_retainer_for_new_case
    AFTER INSERT ON crm.cases
    FOR EACH ROW
    EXECUTE FUNCTION crm.ensure_retainer_for_new_case();
