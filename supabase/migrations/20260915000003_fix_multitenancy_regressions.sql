-- ============================================================================
-- Two regressions from the multitenancy conversion.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The number generators became ambiguous
-- ---------------------------------------------------------------------------
--
-- 20260914000001 declared `generate_case_number(p_tenant UUID DEFAULT NULL)`
-- with CREATE OR REPLACE, intending to replace the original. Because the
-- signature differs, Postgres created an OVERLOAD instead and kept the
-- zero-argument original. Calling `generate_case_number()` — which is exactly
-- how all ten call sites in the app invoke it — then matches both candidates:
--
--   ERROR:  function crm.generate_case_number() is not unique
--
-- So creating a client or a case has been failing everywhere since that
-- migration: staff pages, the public contact form, the NOC apply form, public
-- booking, and the referral agent portal.
--
-- Dropping the originals leaves the tenant-aware versions, whose DEFAULT NULL
-- means the existing no-argument calls keep working and resolve the tenant
-- from the caller's session.
--
-- The old versions also drew from crm.seq_* sequences that 20260914000001
-- already dropped, so they could not have produced a number anyway.

DROP FUNCTION IF EXISTS crm.generate_case_number();
DROP FUNCTION IF EXISTS crm.generate_client_number();
DROP FUNCTION IF EXISTS crm.generate_invoice_number();

-- ---------------------------------------------------------------------------
-- 2. Referral agents could not resolve a tenant
-- ---------------------------------------------------------------------------
--
-- crm.current_tenant_id() read only crm.staff. A referral agent has no staff
-- row — the two are mutually exclusive, enforced by trigger — so it returned
-- NULL for them, every RESTRICTIVE tenant_isolation policy compared
-- `tenant_id = NULL`, and the agent portal denied everything. Agents could not
-- sign in at all.
--
-- It failed closed rather than leaking, which is the right failure, but it is
-- still a total outage for that portal.
--
-- Both branches are filtered the same way, and a person cannot hold both kinds
-- of account, so the UNION ALL returns at most one row.

CREATE OR REPLACE FUNCTION crm.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id FROM (
        SELECT s.tenant_id
          FROM crm.staff s
         WHERE s.auth_user_id = auth.uid()
           AND s.is_active = TRUE
           AND s.deleted_at IS NULL
        UNION ALL
        SELECT a.tenant_id
          FROM crm.referral_agents a
         WHERE a.auth_user_id = auth.uid()
           AND a.is_active = TRUE
           AND a.deleted_at IS NULL
    ) AS actor
    LIMIT 1;
$$;

COMMENT ON FUNCTION crm.current_tenant_id() IS
    'Tenant of the signed-in actor, whether they are firm staff or a referral '
    'agent. NULL for service_role and for anyone with neither kind of active '
    'account, which makes every isolation policy fail closed.';
