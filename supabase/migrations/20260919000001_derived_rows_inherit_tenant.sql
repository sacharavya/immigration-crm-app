-- ============================================================================
-- Documents, payments and case events inherit their firm from their parent.
-- ============================================================================
--
-- These three tables are written by the public portals — a client uploading
-- a document, paying a case fee, paying a consultation fee — which run as
-- the service role. Their tenant_id column defaults to
-- crm.current_tenant_id(), which reads the caller's session; under the
-- service role that is NULL, so every one of those inserts failed on NOT
-- NULL, and /pay handed the raw constraint message to the client.
--
-- The earlier multitenancy pass fixed the client-row inserts by passing the
-- firm explicitly at each site. These rows already carry a case_id or a
-- client_id, and the parent row knows its firm, so it is derived here once
-- rather than threaded through seventeen call sites — and every future
-- service-role insert is covered as well.
--
-- Fail closed: a row that arrives with no derivable parent is refused, and a
-- row whose stated firm disagrees with its parent's is refused too. The
-- latter cannot happen through RLS today, but it is cheap to guarantee.

CREATE OR REPLACE FUNCTION crm.fill_tenant_from_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row     JSONB := to_jsonb(NEW);   -- lets one function serve tables with different columns
    v_case    UUID  := (v_row ->> 'case_id')::uuid;
    v_client  UUID  := (v_row ->> 'client_id')::uuid;
    v_parent  UUID;
BEGIN
    IF v_case IS NOT NULL THEN
        SELECT tenant_id INTO v_parent FROM crm.cases WHERE id = v_case;
    END IF;
    IF v_parent IS NULL AND v_client IS NOT NULL THEN
        SELECT tenant_id INTO v_parent FROM crm.clients WHERE id = v_client;
    END IF;

    IF NEW.tenant_id IS NULL THEN
        IF v_parent IS NULL THEN
            RAISE EXCEPTION
                '%.%: tenant_id is required and could not be derived — '
                'neither case_id nor client_id resolves to a firm.',
                TG_TABLE_SCHEMA, TG_TABLE_NAME;
        END IF;
        NEW.tenant_id := v_parent;
    ELSIF v_parent IS NOT NULL AND NEW.tenant_id <> v_parent THEN
        RAISE EXCEPTION
            '%.%: tenant_id % does not match the parent row''s firm %.',
            TG_TABLE_SCHEMA, TG_TABLE_NAME, NEW.tenant_id, v_parent;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fill_tenant_documents
    BEFORE INSERT ON files.documents
    FOR EACH ROW EXECUTE FUNCTION crm.fill_tenant_from_parent();

CREATE TRIGGER trg_fill_tenant_payments
    BEFORE INSERT ON crm.payments
    FOR EACH ROW EXECUTE FUNCTION crm.fill_tenant_from_parent();

CREATE TRIGGER trg_fill_tenant_case_events
    BEFORE INSERT ON crm.case_events
    FOR EACH ROW EXECUTE FUNCTION crm.fill_tenant_from_parent();
