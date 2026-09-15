-- ============================================================================
-- Platform admin: permanently remove a firm and everything it owns.
-- ============================================================================
--
-- This is the most destructive thing the platform can do, so it is built to
-- resist being done by accident:
--
--   1. Every tenant_id foreign key is ON DELETE RESTRICT. A bare
--      "DELETE FROM crm.tenants" therefore fails while any data exists.
--      That is the safety net, and it stays; this function removes the
--      children explicitly rather than weakening the constraint to CASCADE.
--   2. The caller must pass the firm's exact name. A mistyped or stale id
--      cannot delete the wrong firm.
--   3. A preview function returns what would be destroyed, so the operator
--      sees the volume before agreeing to it.
--   4. What was deleted is recorded in platform.deleted_tenants, because
--      "the firm is gone" is not an acceptable answer to "what happened to
--      our data?".
--
-- Auth users are NOT deleted here. The function returns their ids and the
-- server action removes them through the Auth admin API, which is the
-- supported path and keeps this function out of auth internals.

CREATE TABLE platform.deleted_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Row counts per table at the moment of deletion.
    row_counts JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE platform.deleted_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_reads_deleted_tenants
    ON platform.deleted_tenants FOR SELECT TO authenticated
    USING (platform.is_admin());

CREATE POLICY service_role_deleted_tenants
    ON platform.deleted_tenants FOR ALL TO service_role USING (true);

GRANT SELECT ON platform.deleted_tenants TO authenticated;
GRANT ALL ON platform.deleted_tenants TO service_role;

-- Every table carrying a tenant_id, so both functions below work from one
-- list and cannot drift apart.
CREATE OR REPLACE FUNCTION platform.tenant_owned_tables()
RETURNS TABLE (schema_name TEXT, table_name TEXT)
LANGUAGE sql
STABLE
AS $$
    SELECT c.table_schema::TEXT, c.table_name::TEXT
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
       AND t.table_type = 'BASE TABLE'
     WHERE c.column_name = 'tenant_id'
       AND c.table_schema IN ('crm', 'files', 'ref', 'audit', 'platform')
       AND NOT (c.table_schema = 'crm' AND c.table_name = 'tenants')
       -- The tombstone carries a tenant_id but is deliberately NOT tenant
       -- data: it is the record that the firm was deleted, so it has to
       -- outlive the firm. Its tenant_id is a plain UUID with no foreign
       -- key for exactly that reason.
       AND NOT (c.table_schema = 'platform' AND c.table_name = 'deleted_tenants');
$$;

-- What would be destroyed. Read-only.
CREATE OR REPLACE FUNCTION platform.tenant_delete_preview(p_tenant UUID)
RETURNS TABLE (table_ref TEXT, row_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    r RECORD;
    v_count BIGINT;
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'tenant_delete_preview is restricted to platform admins';
    END IF;

    FOR r IN SELECT * FROM platform.tenant_owned_tables() LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = $1',
                       r.schema_name, r.table_name)
           INTO v_count USING p_tenant;
        IF v_count > 0 THEN
            table_ref := r.schema_name || '.' || r.table_name;
            row_count := v_count;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION platform.tenant_delete_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.tenant_delete_preview(UUID) TO authenticated, service_role;

-- Permanently deletes the firm. Returns the auth user ids to clean up.
CREATE OR REPLACE FUNCTION platform.delete_tenant(
    p_tenant UUID,
    p_confirm_name TEXT
)
RETURNS TABLE (auth_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_name TEXT;
    v_slug TEXT;
    v_counts JSONB := '{}'::jsonb;
    r RECORD;
    v_count BIGINT;
    v_pass INT := 0;
    v_deleted_any BOOLEAN;
    v_rows BIGINT;
    v_remaining INT;
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'delete_tenant is restricted to platform admins';
    END IF;

    SELECT name, slug INTO v_name, v_slug FROM crm.tenants WHERE id = p_tenant;
    IF v_name IS NULL THEN
        RAISE EXCEPTION 'No such firm.';
    END IF;

    IF btrim(p_confirm_name) IS DISTINCT FROM v_name THEN
        RAISE EXCEPTION
            'Confirmation does not match. Type the firm name exactly: %', v_name;
    END IF;

    -- Record the volume before it disappears.
    FOR r IN SELECT * FROM platform.tenant_owned_tables() LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = $1',
                       r.schema_name, r.table_name)
           INTO v_count USING p_tenant;
        IF v_count > 0 THEN
            v_counts := v_counts || jsonb_build_object(
                r.schema_name || '.' || r.table_name, v_count);
        END IF;
    END LOOP;

    -- Hand back the accounts to remove from Auth before the rows go.
    RETURN QUERY
    SELECT s.auth_user_id FROM crm.staff s WHERE s.tenant_id = p_tenant;

    -- Delete in repeated passes rather than a hand-maintained table order.
    -- Business tables reference each other (documents -> cases -> clients),
    -- so a fixed list would rot the first time a foreign key is added; the
    -- passes converge instead, and the loop gives up loudly if they don't.
    --
    -- The passes also absorb a subtler effect: deleting a firm's rows fires
    -- the audit trigger, which writes new audit rows carrying that same
    -- tenant_id. A later pass collects those, and audit.change_log has no
    -- trigger of its own, so it terminates.
    LOOP
        v_pass := v_pass + 1;
        v_deleted_any := FALSE;

        FOR r IN SELECT * FROM platform.tenant_owned_tables() LOOP
            BEGIN
                EXECUTE format('DELETE FROM %I.%I WHERE tenant_id = $1',
                               r.schema_name, r.table_name) USING p_tenant;
                -- EXECUTE does not set FOUND, so ask for the row count
                -- explicitly. Relying on FOUND here made the loop believe
                -- every pass deleted something and never converge.
                GET DIAGNOSTICS v_rows = ROW_COUNT;
                IF v_rows > 0 THEN v_deleted_any := TRUE; END IF;
            EXCEPTION WHEN foreign_key_violation THEN
                -- Something still points at these rows; a later pass gets them.
                NULL;
            END;
        END LOOP;

        EXIT WHEN NOT v_deleted_any;

        IF v_pass > 12 THEN
            RAISE EXCEPTION
                'Could not untangle this firm''s rows in % passes. Nothing was '
                'committed.', v_pass;
        END IF;
    END LOOP;

    -- Anything left means a foreign key we cannot resolve; fail rather than
    -- leave the firm half-deleted.
    v_remaining := 0;
    FOR r IN SELECT * FROM platform.tenant_owned_tables() LOOP
        EXECUTE format('SELECT count(*) FROM %I.%I WHERE tenant_id = $1',
                       r.schema_name, r.table_name)
           INTO v_count USING p_tenant;
        v_remaining := v_remaining + v_count;
    END LOOP;

    IF v_remaining > 0 THEN
        RAISE EXCEPTION
            '% rows could not be deleted for this firm. Nothing was committed.',
            v_remaining;
    END IF;

    INSERT INTO platform.deleted_tenants (tenant_id, name, slug, deleted_by, row_counts)
    VALUES (p_tenant, v_name, v_slug, auth.uid(), v_counts);

    DELETE FROM crm.tenants WHERE id = p_tenant;
END;
$$;

REVOKE ALL ON FUNCTION platform.delete_tenant(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.delete_tenant(UUID, TEXT) TO authenticated, service_role;
