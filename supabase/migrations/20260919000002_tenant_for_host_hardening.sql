-- ============================================================================
-- Host resolution: reserved slugs, www, and a fallback that cannot misroute.
-- ============================================================================
--
-- Three gaps in crm.tenant_for_host now that firms get real hostnames:
--
--   1. Nothing stopped a firm taking the slug `app` or `www`, which would
--      shadow the platform's own hosts. Reserved at the schema.
--   2. `www.firm.com` never matched a firm whose custom domain is `firm.com`.
--      A leading www. is stripped before the custom-domain match.
--   3. The single-firm fallback returned the one active firm for ANY host it
--      did not recognise — a typo'd subdomain, a preview URL, the apex. That
--      was harmless with one firm and became a silent misroute the moment a
--      second was created. It now applies only to the platform's own hosts,
--      which is the case it exists for: a one-firm deployment before DNS.
--
-- The apex (`genzdatalabs.com`) is the platform's pitch site, never a firm,
-- so it is excluded from the slug match even if a firm happens to be slugged
-- like the domain. The platform domain is passed in by the app, since SQL has
-- no way to know it.

ALTER TABLE crm.tenants
    ADD CONSTRAINT tenants_slug_not_reserved
    CHECK (slug NOT IN ('app', 'www', 'admin', 'api', 'mail', 'localhost', 'static', 'cdn'));

-- Adding a defaulted parameter with CREATE OR REPLACE makes an overload, not
-- a replacement; the one-argument form would then be ambiguous. Drop first.
DROP FUNCTION IF EXISTS crm.tenant_for_host(TEXT);

CREATE OR REPLACE FUNCTION crm.tenant_for_host(
    p_host TEXT,
    p_platform_domain TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_host     TEXT := lower(split_part(coalesce(p_host, ''), ':', 1));
    v_platform TEXT := lower(nullif(btrim(coalesce(p_platform_domain, '')), ''));
    v_label    TEXT;
    v_tenant   UUID;
    v_is_platform_host BOOLEAN;
BEGIN
    IF v_host = '' THEN RETURN NULL; END IF;

    -- www.firm.com and firm.com are the same firm.
    IF v_host LIKE 'www.%' THEN
        v_host := substr(v_host, 5);
    END IF;

    -- 1. exact custom domain
    SELECT id INTO v_tenant FROM crm.tenants
     WHERE public_host = v_host AND status = 'active';
    IF v_tenant IS NOT NULL THEN RETURN v_tenant; END IF;

    v_label := split_part(v_host, '.', 1);
    v_is_platform_host :=
        v_label IN ('app', 'www', 'localhost')
        OR (v_platform IS NOT NULL AND v_host = v_platform);

    -- 2. leftmost label as the slug — but never for the platform's own hosts
    IF NOT v_is_platform_host AND v_label <> '' THEN
        SELECT id INTO v_tenant FROM crm.tenants
         WHERE slug = v_label AND status = 'active';
        IF v_tenant IS NOT NULL THEN RETURN v_tenant; END IF;
        -- A firm-shaped host that names no firm is an unknown host: NULL,
        -- never "whichever firm happens to exist".
        RETURN NULL;
    END IF;

    -- 3. single-firm deployment, reached only from the platform's own hosts
    IF (SELECT count(*) FROM crm.tenants WHERE status = 'active') = 1 THEN
        SELECT id INTO v_tenant FROM crm.tenants WHERE status = 'active';
        RETURN v_tenant;
    END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.tenant_for_host(TEXT, TEXT) TO service_role, authenticated;
