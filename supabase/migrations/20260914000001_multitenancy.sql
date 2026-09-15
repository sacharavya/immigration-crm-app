-- ============================================================================
-- Multitenancy: shared tables + tenant_id + RLS isolation.
-- ============================================================================
--
-- Model: one set of tables, every tenant-owned row carries `tenant_id`, and
-- Postgres RLS enforces the boundary. Chosen over schema-per-tenant so there
-- is exactly one set of migrations to run.
--
-- How isolation is enforced, and why it is only ~40 lines instead of a
-- rewrite of the ~100 existing policies:
--
--   Postgres combines PERMISSIVE policies with OR, but ANDs every
--   RESTRICTIVE policy on top. So a single restrictive policy per table
--   adds "...and it must belong to my tenant" to every existing rule
--   without touching any of them. Existing policies keep expressing
--   *role* and *ownership*; tenancy is a separate, orthogonal layer.
--
--   The restrictive policies target the `authenticated` role only.
--   `service_role` keeps full access exactly as it does today: it is used
--   by trusted server code (public token flows, cron) that is gated in the
--   application layer, and several of those paths legitimately sweep
--   across tenants. Those call sites pass tenant_id explicitly.
--
-- Two column shapes are used:
--
--   NOT NULL tenant_id  — business data. Defaults to crm.current_tenant_id()
--                         so existing staff-session INSERTs keep working
--                         unchanged; a service-role insert that forgets to
--                         pass one fails loudly rather than leaking.
--
--   NULLable tenant_id  — shared catalogs (IRCC form registry, service
--                         types, checklist groups). NULL means "platform
--                         global, visible to every firm"; a non-NULL value
--                         is that firm's own override or addition. Firms
--                         can read globals but may only write their own.
--
-- Left deliberately global (no tenant_id):
--   crm.software_access_requests — the platform's own B2B signup funnel.
--   crm.size_presets, ref.countries, ref.noc_*, ref.service_categories,
--   ref.document_categories, ref.sowp_list_version — immutable lookups.
--
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tenants
-- ---------------------------------------------------------------------------

CREATE TABLE crm.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,

    -- URL-safe handle, reserved for subdomain or path routing later.
    slug CITEXT NOT NULL UNIQUE
        CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$'),

    -- Prefix for this firm's human-readable numbers (BB-2026-0001).
    number_prefix TEXT NOT NULL DEFAULT 'BB'
        CHECK (number_prefix ~ '^[A-Z0-9]{1,8}$'),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_updated_tenants
    BEFORE UPDATE ON crm.tenants
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- The firm this database already belongs to. Every existing row is
-- backfilled onto it below, so the app behaves identically afterwards.
INSERT INTO crm.tenants (name, slug, number_prefix)
VALUES ('genzdatalabs Immigration', 'genzdatalabs', 'BB');

-- ---------------------------------------------------------------------------
-- 2. crm.staff gets its tenant first
-- ---------------------------------------------------------------------------
--
-- Ordering matters: crm.current_tenant_id() below is a SQL-language function
-- whose body is parsed at creation time, and it reads crm.staff.tenant_id.
-- So the column has to exist before the function, and the function has to
-- exist before any other table can DEFAULT to it.

ALTER TABLE crm.staff ADD COLUMN tenant_id UUID;

UPDATE crm.staff
   SET tenant_id = (SELECT id FROM crm.tenants WHERE slug = 'genzdatalabs');

ALTER TABLE crm.staff
    ALTER COLUMN tenant_id SET NOT NULL,
    ADD CONSTRAINT crm_staff_tenant_fk FOREIGN KEY (tenant_id)
        REFERENCES crm.tenants(id) ON DELETE RESTRICT;

CREATE INDEX idx_crm_staff_tenant ON crm.staff (tenant_id);

-- ---------------------------------------------------------------------------
-- 2. Who am I? — the one function every isolation policy calls
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so it can read crm.staff without tripping that table's
-- own RLS (which would otherwise recurse: the staff policy calls this
-- function, which reads staff...). Mirrors crm.current_staff_role().
CREATE OR REPLACE FUNCTION crm.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT tenant_id
      FROM crm.staff
     WHERE auth_user_id = auth.uid()
       AND is_active = TRUE
       AND deleted_at IS NULL
     LIMIT 1;
$$;

COMMENT ON FUNCTION crm.current_tenant_id() IS
    'Tenant of the signed-in staff member. NULL for service_role and for '
    'anyone with no active staff row, which makes every isolation policy '
    'fail closed.';

-- ---------------------------------------------------------------------------
-- 3. Add tenant_id everywhere
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_default_tenant UUID;
    v_tbl TEXT;

    -- Business data: NOT NULL, defaulted from the session.
    v_owned TEXT[] := ARRAY[
        'crm.appointment_settings', 'crm.appointment_types', 'crm.appointments',
        'crm.case_assignments', 'crm.case_events', 'crm.case_participants',
        'crm.case_requests', 'crm.case_required_documents', 'crm.cases',
        'crm.client_address_history', 'crm.client_biometric_records',
        'crm.client_education_history', 'crm.client_employment_history',
        'crm.client_family_members', 'crm.client_government_positions',
        'crm.client_military_services', 'crm.client_organisations',
        'crm.client_travel_history', 'crm.clients', 'crm.communications',
        'crm.firm_metric_daily', 'crm.form_fills', 'crm.invoice_line_items',
        'crm.invoices', 'crm.notifications', 'crm.package_items',
        'crm.packages', 'crm.payments', 'crm.referral_agents',
        'crm.retainer_agreements', 'crm.storage_settings',
        'crm.tasks',
        'files.documents', 'files.pending_drive_moves'
    ];

    -- Shared catalogs: NULL means platform-global.
    v_shared TEXT[] := ARRAY[
        'crm.forms', 'crm.form_versions',
        'ref.service_types', 'ref.service_templates',
        'ref.template_documents', 'ref.checklist_groups'
    ];
BEGIN
    SELECT id INTO v_default_tenant FROM crm.tenants WHERE slug = 'genzdatalabs';

    FOREACH v_tbl IN ARRAY v_owned LOOP
        EXECUTE format('ALTER TABLE %s ADD COLUMN tenant_id UUID', v_tbl);
        EXECUTE format('UPDATE %s SET tenant_id = %L', v_tbl, v_default_tenant);
        EXECUTE format(
            'ALTER TABLE %s
               ALTER COLUMN tenant_id SET NOT NULL,
               ALTER COLUMN tenant_id SET DEFAULT crm.current_tenant_id(),
               ADD CONSTRAINT %I FOREIGN KEY (tenant_id)
                   REFERENCES crm.tenants(id) ON DELETE RESTRICT',
            v_tbl, replace(v_tbl, '.', '_') || '_tenant_fk');
        EXECUTE format(
            'CREATE INDEX %I ON %s (tenant_id)',
            'idx_' || replace(v_tbl, '.', '_') || '_tenant', v_tbl);
    END LOOP;

    -- Shared catalogs keep their existing rows as global (tenant_id NULL),
    -- so every firm still sees the seeded service types and checklist
    -- groups. No default: a firm-specific row must say so explicitly.
    FOREACH v_tbl IN ARRAY v_shared LOOP
        EXECUTE format('ALTER TABLE %s ADD COLUMN tenant_id UUID', v_tbl);
        EXECUTE format(
            'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (tenant_id)
                 REFERENCES crm.tenants(id) ON DELETE CASCADE',
            v_tbl, replace(v_tbl, '.', '_') || '_tenant_fk');
        EXECUTE format(
            'CREATE INDEX %I ON %s (tenant_id)',
            'idx_' || replace(v_tbl, '.', '_') || '_tenant', v_tbl);
    END LOOP;
END $$;

-- Now that the function exists, staff inserts can default like the rest.
ALTER TABLE crm.staff ALTER COLUMN tenant_id SET DEFAULT crm.current_tenant_id();

-- The audit trail is tenant-scoped, but nullable: changes to platform-level
-- tables (software_access_requests) legitimately have no tenant.
ALTER TABLE audit.change_log ADD COLUMN tenant_id UUID REFERENCES crm.tenants(id);
CREATE INDEX idx_change_log_tenant ON audit.change_log (tenant_id);

-- ---------------------------------------------------------------------------
-- 4. Isolation policies
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_tbl TEXT;
    v_owned TEXT[] := ARRAY[
        'crm.appointment_settings', 'crm.appointment_types', 'crm.appointments',
        'crm.case_assignments', 'crm.case_events', 'crm.case_participants',
        'crm.case_requests', 'crm.case_required_documents', 'crm.cases',
        'crm.client_address_history', 'crm.client_biometric_records',
        'crm.client_education_history', 'crm.client_employment_history',
        'crm.client_family_members', 'crm.client_government_positions',
        'crm.client_military_services', 'crm.client_organisations',
        'crm.client_travel_history', 'crm.clients', 'crm.communications',
        'crm.firm_metric_daily', 'crm.form_fills', 'crm.invoice_line_items',
        'crm.invoices', 'crm.notifications', 'crm.package_items',
        'crm.packages', 'crm.payments', 'crm.referral_agents',
        'crm.retainer_agreements', 'crm.staff', 'crm.storage_settings',
        'crm.tasks',
        'files.documents', 'files.pending_drive_moves'
    ];
    v_shared TEXT[] := ARRAY[
        'crm.forms', 'crm.form_versions',
        'ref.service_types', 'ref.service_templates',
        'ref.template_documents', 'ref.checklist_groups'
    ];
BEGIN
    -- Business data: you may only ever see or write your own tenant's rows.
    FOREACH v_tbl IN ARRAY v_owned LOOP
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %s
                 AS RESTRICTIVE TO authenticated
                 USING (tenant_id = crm.current_tenant_id())
                 WITH CHECK (tenant_id = crm.current_tenant_id())',
            v_tbl);
    END LOOP;

    -- Shared catalogs: read the globals and your own; write only your own.
    FOREACH v_tbl IN ARRAY v_shared LOOP
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %s
                 AS RESTRICTIVE TO authenticated
                 USING (tenant_id IS NULL OR tenant_id = crm.current_tenant_id())
                 WITH CHECK (tenant_id = crm.current_tenant_id())',
            v_tbl);
    END LOOP;
END $$;

-- pending_drive_moves had RLS enabled but no policy at all, so authenticated
-- access was already fully closed; it stays that way (service_role only).

ALTER TABLE crm.tenants ENABLE ROW LEVEL SECURITY;

-- A staff member may read their own firm's row, nothing else. Only the
-- platform (service_role) creates or suspends tenants.
CREATE POLICY staff_read_own_tenant
    ON crm.tenants FOR SELECT TO authenticated
    USING (id = crm.current_tenant_id());

CREATE POLICY service_role_tenants
    ON crm.tenants FOR ALL TO service_role USING (true);

GRANT SELECT ON crm.tenants TO authenticated;
GRANT ALL ON crm.tenants TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Uniqueness that must become per-tenant
-- ---------------------------------------------------------------------------

-- Human-readable numbers: two firms may both run a "BB-2026-0001".
ALTER TABLE crm.cases DROP CONSTRAINT cases_case_number_key;
ALTER TABLE crm.cases ADD CONSTRAINT cases_tenant_case_number_key
    UNIQUE (tenant_id, case_number);

ALTER TABLE crm.clients DROP CONSTRAINT clients_client_number_key;
ALTER TABLE crm.clients ADD CONSTRAINT clients_tenant_client_number_key
    UNIQUE (tenant_id, client_number);

ALTER TABLE crm.invoices DROP CONSTRAINT invoices_invoice_number_key;
ALTER TABLE crm.invoices ADD CONSTRAINT invoices_tenant_invoice_number_key
    UNIQUE (tenant_id, invoice_number);

-- Each firm picks its own appointment type codes (consult, case_review...).
ALTER TABLE crm.appointment_types DROP CONSTRAINT appointment_types_code_key;
ALTER TABLE crm.appointment_types ADD CONSTRAINT appointment_types_tenant_code_key
    UNIQUE (tenant_id, code);

-- Daily metrics were keyed on the date alone — two firms' rollups for the
-- same day would have collided outright.
ALTER TABLE crm.firm_metric_daily DROP CONSTRAINT firm_metric_daily_pkey;
ALTER TABLE crm.firm_metric_daily ADD PRIMARY KEY (tenant_id, snapshot_date);

-- Settings singletons become one row per firm.
DROP INDEX crm.idx_appointment_settings_singleton;
CREATE UNIQUE INDEX idx_appointment_settings_per_tenant
    ON crm.appointment_settings (tenant_id);

DROP INDEX crm.idx_storage_settings_singleton;
CREATE UNIQUE INDEX idx_storage_settings_per_tenant
    ON crm.storage_settings (tenant_id);

-- Shared catalog codes: unique among the globals, and unique within each
-- firm, but a firm may shadow a global code with its own variant.
-- NULLS NOT DISTINCT makes the global rows (tenant_id NULL) collide with
-- each other as intended.
ALTER TABLE ref.service_types DROP CONSTRAINT service_types_code_key;
CREATE UNIQUE INDEX service_types_tenant_code_key
    ON ref.service_types (tenant_id, code) NULLS NOT DISTINCT;

-- Firm-scoped form numbers: the pre-existing partial index already covers
-- the global catalog (scope='global'); firm-scoped rows were unconstrained.
CREATE UNIQUE INDEX idx_forms_tenant_number
    ON crm.forms (tenant_id, lower(form_number))
    WHERE scope <> 'global';

-- Deliberately left globally unique:
--   crm.staff.auth_user_id / .email, crm.referral_agents.auth_user_id
--     — one Supabase auth identity maps to one person at one firm.
--   every public token (client_portal_token, intake_portal_token,
--     management_token, consultation_agreement_token, signing_token)
--     — these are looked up from unauthenticated URLs that have no tenant
--       context yet, so the token itself must be the whole key.

-- ---------------------------------------------------------------------------
-- 6. Per-tenant numbering
-- ---------------------------------------------------------------------------
--
-- The old generators drew from three global sequences. Under multitenancy
-- that interleaves firms into one counter: firm A would see BB-2026-0001,
-- then 0004, then 0009, and no firm could start at 0001.

CREATE TABLE crm.number_counters (
    tenant_id UUID NOT NULL REFERENCES crm.tenants(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('case', 'client', 'invoice')),
    year INT NOT NULL,
    next_value INT NOT NULL DEFAULT 1,
    PRIMARY KEY (tenant_id, kind, year)
);

ALTER TABLE crm.number_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_role_number_counters
    ON crm.number_counters FOR ALL TO service_role USING (true);
GRANT ALL ON crm.number_counters TO service_role;
-- No authenticated policy: reached only through the SECURITY DEFINER
-- functions below, never queried directly.

CREATE OR REPLACE FUNCTION crm.next_number(p_tenant UUID, p_kind TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_value INT;
BEGIN
    IF p_tenant IS NULL THEN
        RAISE EXCEPTION 'next_number: no tenant in scope. A service-role '
                        'caller must pass the tenant id explicitly.';
    END IF;

    INSERT INTO crm.number_counters (tenant_id, kind, year, next_value)
    VALUES (p_tenant, p_kind, v_year, 1)
    ON CONFLICT (tenant_id, kind, year) DO NOTHING;

    -- The UPDATE takes a row lock, so concurrent callers serialise here and
    -- each gets a distinct number.
    UPDATE crm.number_counters
       SET next_value = next_value + 1
     WHERE tenant_id = p_tenant AND kind = p_kind AND year = v_year
     RETURNING next_value - 1 INTO v_value;

    RETURN v_value;
END;
$$;

-- The three generators keep their zero-argument call signature so existing
-- .rpc("generate_case_number") calls are unchanged; service-role callers
-- pass the tenant explicitly.
CREATE OR REPLACE FUNCTION crm.generate_case_number(p_tenant UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID := COALESCE(p_tenant, crm.current_tenant_id());
    v_prefix TEXT;
BEGIN
    SELECT number_prefix INTO v_prefix FROM crm.tenants WHERE id = v_tenant;
    RETURN v_prefix || '-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
           lpad(crm.next_number(v_tenant, 'case')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION crm.generate_client_number(p_tenant UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID := COALESCE(p_tenant, crm.current_tenant_id());
    v_prefix TEXT;
BEGIN
    SELECT number_prefix INTO v_prefix FROM crm.tenants WHERE id = v_tenant;
    RETURN v_prefix || '-C-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
           lpad(crm.next_number(v_tenant, 'client')::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION crm.generate_invoice_number(p_tenant UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID := COALESCE(p_tenant, crm.current_tenant_id());
    v_prefix TEXT;
BEGIN
    SELECT number_prefix INTO v_prefix FROM crm.tenants WHERE id = v_tenant;
    RETURN v_prefix || '-INV-' || to_char(CURRENT_DATE, 'YYYY') || '-' ||
           lpad(crm.next_number(v_tenant, 'invoice')::TEXT, 4, '0');
END;
$$;

-- Carry the existing numbering forward so the first case created after this
-- migration doesn't reuse a number already in use.
INSERT INTO crm.number_counters (tenant_id, kind, year, next_value)
SELECT t.id, k.kind, EXTRACT(YEAR FROM CURRENT_DATE)::INT,
       GREATEST(1, COALESCE(k.used, 0) + 1)
  FROM crm.tenants t
  CROSS JOIN LATERAL (
        VALUES
          ('case',   (SELECT count(*)::INT FROM crm.cases    WHERE tenant_id = t.id)),
          ('client', (SELECT count(*)::INT FROM crm.clients  WHERE tenant_id = t.id)),
          ('invoice',(SELECT count(*)::INT FROM crm.invoices WHERE tenant_id = t.id))
       ) AS k(kind, used)
ON CONFLICT DO NOTHING;

DROP SEQUENCE IF EXISTS crm.seq_case_number;
DROP SEQUENCE IF EXISTS crm.seq_client_number;
DROP SEQUENCE IF EXISTS crm.seq_invoice_number;

-- ---------------------------------------------------------------------------
-- 7. Close the cross-tenant leaks in triggers
-- ---------------------------------------------------------------------------

-- Root cause of three separate leaks: this helper fans out to every staff
-- member on the platform. notify_new_lead, notify_appointment_booked and
-- notify_software_access_request all call it, so one tenant predicate here
-- fixes all three.
CREATE OR REPLACE FUNCTION crm.staff_ids_with_permission(p_permission TEXT)
RETURNS TABLE (staff_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT s.id
      FROM crm.staff s
     WHERE s.deleted_at IS NULL
       AND s.is_active = TRUE
       AND s.tenant_id IS NOT DISTINCT FROM crm.current_tenant_id()
       AND crm.staff_can(s.auth_user_id, p_permission);
$$;

COMMENT ON FUNCTION crm.staff_ids_with_permission(TEXT) IS
    'Staff in the CURRENT tenant holding a permission. The tenant predicate '
    'is what keeps notification fan-out from crossing firms.';

-- A case may only be assigned to a staff member of the same firm. The FK
-- alone cannot express this, since both sides are tenant-scoped separately.
CREATE OR REPLACE FUNCTION crm.assert_assignment_same_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_staff_tenant UUID;
    v_case_tenant UUID;
BEGIN
    SELECT tenant_id INTO v_staff_tenant FROM crm.staff WHERE id = NEW.staff_id;
    SELECT tenant_id INTO v_case_tenant FROM crm.cases WHERE id = NEW.case_id;

    IF v_staff_tenant IS DISTINCT FROM v_case_tenant THEN
        RAISE EXCEPTION
            'Cross-tenant case assignment refused: staff % belongs to a '
            'different firm than case %.', NEW.staff_id, NEW.case_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_case_assignment_same_tenant
    BEFORE INSERT OR UPDATE ON crm.case_assignments
    FOR EACH ROW EXECUTE FUNCTION crm.assert_assignment_same_tenant();

-- ---------------------------------------------------------------------------
-- 8. Stamp the audit trail with the tenant of the row that changed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit.log_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_user_id UUID := auth.uid();
    v_actor_staff_id UUID;
    v_row_id UUID;
    v_changed TEXT[];
    v_tenant UUID;
BEGIN
    SELECT id INTO v_actor_staff_id FROM crm.staff WHERE auth_user_id = v_actor_user_id;

    IF TG_OP = 'DELETE' THEN
        v_row_id := (row_to_json(OLD)->>'id')::uuid;
        -- Read tenant_id off the changed row itself. Tables without the
        -- column (platform-level ones) yield NULL, which is correct.
        v_tenant := NULLIF(to_jsonb(OLD)->>'tenant_id', '')::uuid;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, old_values, tenant_id)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'D', v_row_id, to_jsonb(OLD), v_tenant);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_row_id := (row_to_json(NEW)->>'id')::uuid;
        v_tenant := NULLIF(to_jsonb(NEW)->>'tenant_id', '')::uuid;
        SELECT array_agg(key) INTO v_changed
        FROM jsonb_each(to_jsonb(NEW))
        WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, old_values, new_values, changed_columns, tenant_id)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'U', v_row_id, to_jsonb(OLD), to_jsonb(NEW), v_changed, v_tenant);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_row_id := (row_to_json(NEW)->>'id')::uuid;
        v_tenant := NULLIF(to_jsonb(NEW)->>'tenant_id', '')::uuid;
        INSERT INTO audit.change_log(actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, new_values, tenant_id)
        VALUES (v_actor_user_id, v_actor_staff_id, TG_TABLE_SCHEMA, TG_TABLE_NAME, 'I', v_row_id, to_jsonb(NEW), v_tenant);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Scope the audit read policy to the reader's own firm. The existing
-- permissive policies stay; this restrictive one ANDs onto them, and lets
-- platform-level rows (tenant_id NULL) stay visible to nobody but
-- service_role.
CREATE POLICY tenant_isolation
    ON audit.change_log
    AS RESTRICTIVE TO authenticated
    USING (tenant_id = crm.current_tenant_id())
    WITH CHECK (tenant_id = crm.current_tenant_id());

-- ---------------------------------------------------------------------------
-- 9. Provisioning a new firm
-- ---------------------------------------------------------------------------

-- Creates the tenant plus the settings rows the app expects to exist, so a
-- new firm's dashboard doesn't render the "settings row missing" error.
-- Service-role only; called by the platform's onboarding flow.
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

    INSERT INTO crm.appointment_settings (tenant_id) VALUES (v_tenant);
    INSERT INTO crm.storage_settings (tenant_id) VALUES (v_tenant);

    RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION crm.provision_tenant(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.provision_tenant(TEXT, TEXT, TEXT) TO service_role;
