-- ============================================================================
-- Referral agents / partners — as LOGIN identities
--
-- External people or organizations that refer clients to the firm (partner
-- agencies, individual consultants, lawyers, etc.). An agent has its OWN auth
-- user and logs into a scoped portal where it can create clients and see ONLY
-- the clients it created. Internal Big Bang staff see ALL clients (including
-- agent-created ones) plus who created each.
--
-- An auth user is EITHER a staff (crm.staff) OR an agent (crm.referral_agents),
-- never both — enforced by mutual-exclusion triggers below. crm.staff_can()
-- returns FALSE for an agent (no staff row), so every existing staff-scoped RLS
-- policy already denies agents. Agents reach their slice through the two
-- additive client policies + current_agent_id() helper added here.
--
-- IDEMPOTENT BY DESIGN. An earlier directory-only crm.referral_agents (no
-- login) was applied to some environments out-of-band (migration skew — see the
-- deploy-topology notes). Every statement here is guarded (IF NOT EXISTS / OR
-- REPLACE / DROP-then-CREATE) so this migration safely UPGRADES a partial
-- existing table to the login-capable shape AND creates it from scratch on a
-- fresh database. Re-running it is a no-op.
--
-- New permissions (TS/SQL lock-step — see src/lib/auth/permissions.ts):
--   view_agents   — staff read the referral-agent directory
--   manage_agents — staff create / edit / deactivate agents
-- ============================================================================

-- enum: CREATE TYPE has no IF NOT EXISTS, so guard it.
DO $$
BEGIN
    CREATE TYPE crm.referral_agent_type AS ENUM (
        'individual', 'agency', 'partner', 'lawyer', 'consultant', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Full table for fresh databases. Skipped where it already exists.
CREATE TABLE IF NOT EXISTS crm.referral_agents (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id     UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    name             TEXT NOT NULL,
    organization     TEXT,
    agent_type       crm.referral_agent_type NOT NULL DEFAULT 'individual',
    email            CITEXT,
    phone            TEXT,
    website          TEXT,
    country_code     CHAR(2) REFERENCES ref.countries(code),
    commission_terms TEXT,
    notes            TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    password_reset_required_at TIMESTAMPTZ,
    created_by       UUID REFERENCES crm.staff(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    deactivated_at   TIMESTAMPTZ,
    deactivated_by   UUID REFERENCES crm.staff(id)
);

-- Upgrade an existing (directory-only) table to the full shape. Each column is
-- additive and idempotent; columns the table already has are left untouched.
ALTER TABLE crm.referral_agents
    ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS organization TEXT,
    ADD COLUMN IF NOT EXISTS agent_type crm.referral_agent_type NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS email CITEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS country_code CHAR(2) REFERENCES ref.countries(code),
    ADD COLUMN IF NOT EXISTS commission_terms TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS password_reset_required_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES crm.staff(id),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES crm.staff(id);

-- A unique index doubles as the auth_user_id UNIQUE guard when the column was
-- added via ALTER (ADD COLUMN ... UNIQUE isn't expressible with IF NOT EXISTS).
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_agents_auth_user
    ON crm.referral_agents(auth_user_id) WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_referral_agents_active   ON crm.referral_agents(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_agents_type     ON crm.referral_agents(agent_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_referral_agents_name_trgm
    ON crm.referral_agents USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_updated_referral_agents ON crm.referral_agents;
CREATE TRIGGER trg_updated_referral_agents
    BEFORE UPDATE ON crm.referral_agents
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

DROP TRIGGER IF EXISTS trg_audit_referral_agents ON crm.referral_agents;
CREATE TRIGGER trg_audit_referral_agents
    AFTER INSERT OR UPDATE OR DELETE ON crm.referral_agents
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- ---------------------------------------------------------------------------
-- Client attribution column
-- ---------------------------------------------------------------------------

ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS created_by_agent UUID REFERENCES crm.referral_agents(id);

CREATE INDEX IF NOT EXISTS idx_clients_created_by_agent
    ON crm.clients(created_by_agent) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- current_agent_id() — the agent equivalent of crm.current_staff_id()
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.current_agent_id() RETURNS UUID
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = pg_catalog, public
AS $$
    SELECT id
      FROM crm.referral_agents
     WHERE auth_user_id = auth.uid()
       AND is_active = TRUE
       AND deleted_at IS NULL
     LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION crm.current_agent_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- Mutual exclusion: an auth user must not be both staff and agent. If it were,
-- staff_can() would be TRUE *and* current_agent_id() non-null, silently
-- granting full staff access. Enforce in the DB, not just app code.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.assert_not_staff_auth_user() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.auth_user_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM crm.staff WHERE auth_user_id = NEW.auth_user_id) THEN
        RAISE EXCEPTION 'auth user % is already a staff member; cannot also be a referral agent', NEW.auth_user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agent_not_staff ON crm.referral_agents;
CREATE TRIGGER trg_agent_not_staff
    BEFORE INSERT OR UPDATE OF auth_user_id ON crm.referral_agents
    FOR EACH ROW EXECUTE FUNCTION crm.assert_not_staff_auth_user();

CREATE OR REPLACE FUNCTION crm.assert_not_agent_auth_user() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.auth_user_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM crm.referral_agents WHERE auth_user_id = NEW.auth_user_id) THEN
        RAISE EXCEPTION 'auth user % is already a referral agent; cannot also be staff', NEW.auth_user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_not_agent ON crm.staff;
CREATE TRIGGER trg_staff_not_agent
    BEFORE INSERT OR UPDATE OF auth_user_id ON crm.staff
    FOR EACH ROW EXECUTE FUNCTION crm.assert_not_agent_auth_user();

-- ---------------------------------------------------------------------------
-- Defense-in-depth: scrub staff-only columns on an agent's client insert.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.scrub_agent_client_insert() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_agent UUID := crm.current_agent_id();
BEGIN
    IF v_agent IS NOT NULL THEN
        NEW.created_by_agent      := v_agent;   -- force self-attribution
        NEW.created_by            := NULL;      -- no staff author
        NEW.assigned_rcic         := NULL;
        NEW.primary_contact_staff := NULL;
        NEW.status                := 'lead';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scrub_agent_client_insert ON crm.clients;
CREATE TRIGGER trg_scrub_agent_client_insert
    BEFORE INSERT ON crm.clients
    FOR EACH ROW EXECUTE FUNCTION crm.scrub_agent_client_insert();

-- ---------------------------------------------------------------------------
-- RLS — crm.referral_agents (mandatory: authenticated holds blanket DML)
-- ---------------------------------------------------------------------------

ALTER TABLE crm.referral_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_agents_select_staff ON crm.referral_agents;
CREATE POLICY referral_agents_select_staff ON crm.referral_agents
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_agents'));

DROP POLICY IF EXISTS referral_agents_insert_staff ON crm.referral_agents;
CREATE POLICY referral_agents_insert_staff ON crm.referral_agents
    FOR INSERT
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_agents'));

DROP POLICY IF EXISTS referral_agents_update_staff ON crm.referral_agents;
CREATE POLICY referral_agents_update_staff ON crm.referral_agents
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'manage_agents'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_agents'));

-- An agent may read ONLY its own row (portal header / profile). No self-write.
DROP POLICY IF EXISTS referral_agents_select_self ON crm.referral_agents;
CREATE POLICY referral_agents_select_self ON crm.referral_agents
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS — crm.clients agent slice (additive; existing staff policies untouched)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS clients_agent_select ON crm.clients;
CREATE POLICY clients_agent_select ON crm.clients
    FOR SELECT
    USING (
        created_by_agent IS NOT NULL
        AND created_by_agent = crm.current_agent_id()
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS clients_agent_insert ON crm.clients;
CREATE POLICY clients_agent_insert ON crm.clients
    FOR INSERT
    WITH CHECK (
        crm.current_agent_id() IS NOT NULL
        AND created_by_agent = crm.current_agent_id()
    );

-- ---------------------------------------------------------------------------
-- crm.staff_can() — add view_agents + manage_agents to the role table.
-- Body copied verbatim from 20260624000003_harden_rls_staff_can_and_case_events.sql;
-- the ONLY change is 'view_agents' added to the rcic + reception branches.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.staff_can(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_role TEXT;
    v_overrides JSONB;
    v_override JSONB;
BEGIN
    SELECT role::text, permission_overrides
      INTO v_role, v_overrides
      FROM crm.staff
     WHERE auth_user_id = p_user_id
       AND deleted_at IS NULL
       AND is_active = TRUE
     LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    IF p_permission IN (
        'delete_cases',
        'delete_clients',
        'delete_checklists'
    ) THEN
        RETURN v_role = 'super_user';
    END IF;

    v_override := v_overrides -> p_permission;
    IF v_override IS NOT NULL THEN
        BEGIN
            RETURN (v_override::text)::boolean;
        EXCEPTION WHEN others THEN
            RETURN FALSE;
        END;
    END IF;

    RETURN CASE v_role
        WHEN 'super_user' THEN TRUE
        WHEN 'admin' THEN p_permission NOT IN (
            'manage_super_users',
            'manage_admins',
            'change_system_settings'
        )
        WHEN 'rcic' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'advance_phase',
            'view_clients', 'create_clients', 'edit_clients',
            'view_documents', 'upload_documents', 'review_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_financials', 'record_payments', 'edit_invoices',
            'view_intake_form', 'edit_intake_form',
            'manage_templates',
            'manage_appointments',
            'review_payments',
            'view_agents'
        )
        WHEN 'document_officer' THEN p_permission IN (
            'view_dashboard',
            'view_cases', 'create_cases', 'edit_cases',
            'view_clients', 'edit_clients',
            'view_documents', 'upload_documents',
            'view_communications', 'create_communications',
            'view_tasks', 'manage_tasks',
            'view_intake_form', 'edit_intake_form'
        )
        WHEN 'reception' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients', 'create_clients',
            'view_communications', 'create_communications',
            'view_tasks',
            'manage_appointments',
            'review_payments',
            'view_agents'
        )
        WHEN 'readonly' THEN p_permission IN (
            'view_dashboard',
            'view_cases',
            'view_clients',
            'view_documents',
            'view_communications',
            'view_tasks',
            'view_financials',
            'view_intake_form'
        )
        ELSE FALSE
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.staff_can(UUID, TEXT) TO authenticated;
