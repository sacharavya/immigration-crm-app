-- ============================================================================
-- Platform (super admin) layer: manage firms without seeing their data.
-- ============================================================================
--
-- The defining constraint: a platform admin can create, configure, suspend
-- and support tenants, but must NOT be able to read any tenant's client,
-- case, document or financial data.
--
-- That is enforced structurally rather than by a rule we have to remember:
-- a platform admin has no row in crm.staff, so crm.current_tenant_id()
-- returns NULL for them, and every tenant_isolation policy from the
-- multitenancy migration compares `tenant_id = NULL`, which is NULL, which
-- denies. They are locked out of tenant data by the same mechanism that
-- keeps firms apart, not by a separate carve-out that could drift.
--
-- What they CAN reach is only what this migration grants: the tenant
-- registry, the feature catalogue, and the support inbox.

CREATE SCHEMA IF NOT EXISTS platform;
GRANT USAGE ON SCHEMA platform TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Who is a platform admin
-- ---------------------------------------------------------------------------

CREATE TABLE platform.admins (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email CITEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_updated_platform_admins
    BEFORE UPDATE ON platform.admins
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- SECURITY DEFINER so policies can call it without granting everyone read
-- access to the admin roster.
CREATE OR REPLACE FUNCTION platform.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM platform.admins
         WHERE auth_user_id = auth.uid()
           AND is_active = TRUE
    );
$$;

COMMENT ON FUNCTION platform.is_admin() IS
    'True for the platform operator. Deliberately NOT referenced by any '
    'tenant-data policy: admins manage firms, they do not read firm data.';

ALTER TABLE platform.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_reads_roster
    ON platform.admins FOR SELECT TO authenticated
    USING (platform.is_admin());

CREATE POLICY service_role_admins
    ON platform.admins FOR ALL TO service_role USING (true);

GRANT SELECT ON platform.admins TO authenticated;
GRANT ALL ON platform.admins TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Feature catalogue + per-tenant toggles
-- ---------------------------------------------------------------------------

-- The catalogue is what the admin UI renders as a list of switches. Adding a
-- row here is how a new toggle appears in the portal; no UI change needed.
CREATE TABLE platform.features (
    key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_]{1,40}$'),
    label TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    default_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 100
);

ALTER TABLE platform.features ENABLE ROW LEVEL SECURITY;

-- Every signed-in user may read the catalogue: the staff app needs the key
-- list to decide what to render. It contains no tenant data.
CREATE POLICY anyone_reads_features
    ON platform.features FOR SELECT TO authenticated USING (true);

CREATE POLICY admin_writes_features
    ON platform.features FOR ALL TO authenticated
    USING (platform.is_admin()) WITH CHECK (platform.is_admin());

CREATE POLICY service_role_features
    ON platform.features FOR ALL TO service_role USING (true);

GRANT SELECT ON platform.features TO authenticated;
GRANT ALL ON platform.features TO service_role;

INSERT INTO platform.features (key, label, description, default_enabled, display_order) VALUES
    ('appointments',    'Appointments & booking', 'Calendar, appointment types, and the public booking page.', TRUE,  10),
    ('client_portal',   'Client upload portal',   'Token links that let clients upload documents themselves.',  TRUE,  20),
    ('referral_agents', 'Referral partners',      'The partner portal and referral agent accounts.',            TRUE,  30),
    ('pdf_tool',        'PDF tool',               'Form filling and submission package assembly.',              TRUE,  40),
    ('payments',        'Payments & invoicing',   'Invoices, payment records, and e-transfer verification.',    TRUE,  50),
    ('reports',         'Reports',                'Firm metrics dashboards and exports.',                       TRUE,  60);

-- Per-tenant overrides. Absent key = use the catalogue default, so a new
-- feature switches on for everyone without a backfill.
ALTER TABLE crm.tenants
    ADD COLUMN features JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN crm.tenants.features IS
    'Per-tenant feature overrides, {"pdf_tool": false}. A key that is absent '
    'falls back to platform.features.default_enabled.';

-- Support notes the operator keeps about a firm. Never shown to the firm.
ALTER TABLE crm.tenants
    ADD COLUMN admin_notes TEXT NOT NULL DEFAULT '';

-- Resolves a flag the same way in SQL as the app does in TypeScript.
CREATE OR REPLACE FUNCTION crm.tenant_feature_enabled(p_tenant UUID, p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        (SELECT (t.features ->> p_key)::boolean FROM crm.tenants t WHERE t.id = p_tenant),
        (SELECT f.default_enabled FROM platform.features f WHERE f.key = p_key),
        TRUE
    );
$$;

-- ---------------------------------------------------------------------------
-- 3. Tenant registry access for the operator
-- ---------------------------------------------------------------------------
--
-- crm.tenants carries no client data — it is the firm's own name, slug,
-- status and flags — so the operator gets full access to it. This is a
-- PERMISSIVE policy, OR'd with the existing staff_read_own_tenant rule.

CREATE POLICY platform_admin_manages_tenants
    ON crm.tenants FOR ALL TO authenticated
    USING (platform.is_admin())
    WITH CHECK (platform.is_admin());

GRANT INSERT, UPDATE ON crm.tenants TO authenticated;

-- Counts for the admin list, without exposing a single tenant row. Returns
-- aggregates only, and refuses outright unless the caller is an operator.
CREATE OR REPLACE FUNCTION platform.tenant_usage()
RETURNS TABLE (
    tenant_id UUID,
    staff_count BIGINT,
    client_count BIGINT,
    case_count BIGINT,
    last_activity TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'platform.tenant_usage is restricted to platform admins';
    END IF;

    RETURN QUERY
    SELECT t.id,
           (SELECT count(*) FROM crm.staff   s WHERE s.tenant_id = t.id AND s.deleted_at IS NULL),
           (SELECT count(*) FROM crm.clients c WHERE c.tenant_id = t.id AND c.deleted_at IS NULL),
           (SELECT count(*) FROM crm.cases   k WHERE k.tenant_id = t.id AND k.deleted_at IS NULL),
           (SELECT max(s.last_login_at) FROM crm.staff s WHERE s.tenant_id = t.id)
      FROM crm.tenants t;
END;
$$;

REVOKE ALL ON FUNCTION platform.tenant_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.tenant_usage() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Support inbox: complaints and feedback
-- ---------------------------------------------------------------------------

CREATE TYPE platform.feedback_kind AS ENUM ('complaint', 'bug', 'feature_request', 'question');
CREATE TYPE platform.feedback_status AS ENUM ('open', 'in_progress', 'resolved', 'declined');

CREATE TABLE platform.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which firm raised it. Kept even if the tenant is later removed is not
    -- a concern: RESTRICT means a firm with open tickets can't be deleted.
    tenant_id UUID NOT NULL REFERENCES crm.tenants(id) ON DELETE RESTRICT,
    submitted_by UUID REFERENCES crm.staff(id),

    kind platform.feedback_kind NOT NULL DEFAULT 'question',
    subject TEXT NOT NULL CHECK (length(btrim(subject)) BETWEEN 1 AND 200),
    body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 5000),

    status platform.feedback_status NOT NULL DEFAULT 'open',

    -- The operator's reply, shown back to the firm that raised the ticket.
    admin_response TEXT,
    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_tenant ON platform.feedback (tenant_id, created_at DESC);
CREATE INDEX idx_feedback_status ON platform.feedback (status, created_at DESC);

CREATE TRIGGER trg_updated_feedback
    BEFORE UPDATE ON platform.feedback
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

ALTER TABLE platform.feedback ENABLE ROW LEVEL SECURITY;

-- A firm sees and raises only its own tickets.
CREATE POLICY tenant_reads_own_feedback
    ON platform.feedback FOR SELECT TO authenticated
    USING (tenant_id = crm.current_tenant_id());

CREATE POLICY tenant_raises_feedback
    ON platform.feedback FOR INSERT TO authenticated
    WITH CHECK (tenant_id = crm.current_tenant_id());

-- The operator sees every ticket and can triage and reply. This is the one
-- place tenant-authored text reaches the operator, and it is text the firm
-- chose to send.
CREATE POLICY admin_manages_feedback
    ON platform.feedback FOR ALL TO authenticated
    USING (platform.is_admin())
    WITH CHECK (platform.is_admin());

CREATE POLICY service_role_feedback
    ON platform.feedback FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT ON platform.feedback TO authenticated;
GRANT UPDATE ON platform.feedback TO authenticated;
GRANT ALL ON platform.feedback TO service_role;

ALTER TABLE platform.feedback
    ALTER COLUMN tenant_id SET DEFAULT crm.current_tenant_id();

-- ---------------------------------------------------------------------------
-- 5. Provisioning, now that tenants carry features
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.provision_tenant(
    p_name TEXT,
    p_slug TEXT,
    p_number_prefix TEXT DEFAULT 'BB'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID;
BEGIN
    INSERT INTO crm.tenants (name, slug, number_prefix)
    VALUES (p_name, p_slug, p_number_prefix)
    RETURNING id INTO v_tenant;

    -- The settings rows the app expects to exist, so a brand new firm's
    -- dashboard doesn't greet them with "settings row missing".
    INSERT INTO crm.appointment_settings (tenant_id) VALUES (v_tenant);
    INSERT INTO crm.storage_settings (tenant_id) VALUES (v_tenant);

    RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION crm.provision_tenant(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.provision_tenant(TEXT, TEXT, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 6. Resolving a tenant on public, unauthenticated pages
-- ---------------------------------------------------------------------------
--
-- The booking page, contact form and NOC finder have no session, so they
-- cannot use crm.current_tenant_id(). They identify the firm by the host
-- the request arrived on: either a subdomain matching the slug, or a custom
-- domain recorded here.

ALTER TABLE crm.tenants
    ADD COLUMN public_host CITEXT UNIQUE;

COMMENT ON COLUMN crm.tenants.public_host IS
    'Custom domain for this firm''s public pages (book, contact). NULL means '
    'the firm is reached at <slug>.<platform domain> instead.';

-- Service-role only: called from the request path before any session exists.
CREATE OR REPLACE FUNCTION crm.tenant_for_host(p_host TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_host TEXT := lower(split_part(coalesce(p_host, ''), ':', 1));
    v_tenant UUID;
    v_label TEXT;
BEGIN
    -- 1. exact custom domain match
    SELECT id INTO v_tenant FROM crm.tenants
     WHERE public_host = v_host AND status = 'active';
    IF v_tenant IS NOT NULL THEN RETURN v_tenant; END IF;

    -- 2. leftmost label as the slug (rival.example.com -> "rival")
    v_label := split_part(v_host, '.', 1);
    IF v_label <> '' AND v_label NOT IN ('www', 'app', 'localhost') THEN
        SELECT id INTO v_tenant FROM crm.tenants
         WHERE slug = v_label AND status = 'active';
        IF v_tenant IS NOT NULL THEN RETURN v_tenant; END IF;
    END IF;

    -- 3. single-tenant deployment: unambiguous, so don't demand a subdomain.
    SELECT id INTO v_tenant FROM crm.tenants WHERE status = 'active'
     LIMIT 2;
    IF (SELECT count(*) FROM crm.tenants WHERE status = 'active') = 1 THEN
        RETURN v_tenant;
    END IF;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.tenant_for_host(TEXT) TO service_role, authenticated;
