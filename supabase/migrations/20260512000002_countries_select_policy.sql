-- ============================================================================
-- ref.countries: re-enable Data API + open SELECT to authenticated + anon.
--
-- Background: in production, RLS was enabled on ref.countries (no
-- policy attached) AND the Supabase "Data API access" toggle was
-- flipped off. Both together produced "API DISABLED" + deny-all, so
-- the intake form's country dropdowns went empty even though the table
-- has 82 rows. (The diagnostic script earlier still saw all 82 because
-- service_role bypasses both layers.)
--
-- Studio's API toggle works by REVOKEing role grants from anon /
-- authenticated. We restore them here so `supabase db push` is enough
-- to fix it in any environment — no Studio click required.
--
-- Idempotent: GRANT is additive, ENABLE RLS is a no-op if already on,
-- and the DROP/CREATE pair makes the policy creation re-runnable.
-- ============================================================================

GRANT SELECT ON ref.countries TO anon, authenticated;

ALTER TABLE ref.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS countries_select ON ref.countries;
CREATE POLICY countries_select ON ref.countries
    FOR SELECT TO authenticated, anon
    USING (TRUE);
