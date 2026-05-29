-- ============================================================================
-- APPT-1: Appointments module schema.
--
-- Additive only. Introduces:
--   A. crm.appointment_settings   — singleton config row.
--   B. manage_settings permission — super_user + admin.
--   C. crm.appointment_types      — bookable meeting types (3 seeded).
--   D. enums                      — appointment_status, appointment_booking_source.
--   E. crm.appointments           — the bookings themselves.
--   F. manage_appointments perm   — super_user, admin, rcic, reception.
--   G. crm.appointment_slot_is_free() — global-mode overlap guard.
--
-- No UI, no Microsoft Graph, no external calls. Teams / calendar-sync
-- columns are reserved but stay null until APPT-2. public_booking_enabled
-- and teams_auto_create default false and stay false. Existing tables
-- (clients, cases, staff) are untouched.
--
-- Helper functions used (verified against prior migrations):
--   crm.set_updated_at()      — BEFORE UPDATE updated_at trigger fn.
--   audit.log_change()        — AFTER row-change audit trigger fn.
--   crm.current_staff_role()  — returns the caller's role text or NULL.
--   crm.staff_can(uuid, text) — permission check; first arg is auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PART A: appointment_settings (singleton config)
-- ----------------------------------------------------------------------------

CREATE TABLE crm.appointment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_mode TEXT NOT NULL DEFAULT 'global'
        CHECK (booking_mode IN ('global', 'per_staff')),

    -- Business hours per weekday as JSONB.
    -- Format: { "mon": [{"start":"09:00","end":"17:00"}], ... }
    -- Days absent = closed. Multiple ranges per day allowed (lunch break).
    hours_by_weekday JSONB NOT NULL DEFAULT
        '{"mon":[{"start":"09:00","end":"17:00"}],
          "tue":[{"start":"09:00","end":"17:00"}],
          "wed":[{"start":"09:00","end":"17:00"}],
          "thu":[{"start":"09:00","end":"17:00"}],
          "fri":[{"start":"09:00","end":"17:00"}]}'::jsonb,

    slot_increment_minutes INT NOT NULL DEFAULT 30
        CHECK (slot_increment_minutes IN (15, 30, 60)),
    buffer_between_appointments_minutes INT NOT NULL DEFAULT 0
        CHECK (buffer_between_appointments_minutes >= 0),
    minimum_lead_time_hours INT NOT NULL DEFAULT 24
        CHECK (minimum_lead_time_hours >= 0),
    maximum_horizon_days INT NOT NULL DEFAULT 60
        CHECK (maximum_horizon_days BETWEEN 1 AND 365),

    timezone TEXT NOT NULL DEFAULT 'America/Toronto',

    office_address TEXT NOT NULL DEFAULT
        '211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5',
    office_arrival_instructions TEXT,

    default_online_instructions TEXT,

    -- Public booking page master switch (off until APPT-4 ships + tested)
    public_booking_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Whether online appointments auto-create a Teams meeting (APPT-2).
    -- Off now; flip on after the Graph scope is confirmed working.
    teams_auto_create BOOLEAN NOT NULL DEFAULT false,

    -- Calendar sync target
    graph_calendar_owner_email TEXT NOT NULL DEFAULT
        'info@bigbangimmigration.com',

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES crm.staff(id)
);

-- Enforce exactly one row (singleton pattern)
CREATE UNIQUE INDEX idx_appointment_settings_singleton
    ON crm.appointment_settings ((true));

ALTER TABLE crm.appointment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read_appointment_settings
    ON crm.appointment_settings FOR SELECT
    USING (crm.current_staff_role() IS NOT NULL);

CREATE POLICY admin_manage_appointment_settings
    ON crm.appointment_settings FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_settings'));

CREATE POLICY service_role_appointment_settings
    ON crm.appointment_settings FOR ALL TO service_role USING (true);

GRANT SELECT ON crm.appointment_settings TO authenticated;
GRANT ALL ON crm.appointment_settings TO service_role;

CREATE TRIGGER trg_updated_appointment_settings
    BEFORE UPDATE ON crm.appointment_settings
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE TRIGGER trg_audit_appointment_settings
    AFTER INSERT OR UPDATE OR DELETE ON crm.appointment_settings
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

INSERT INTO crm.appointment_settings DEFAULT VALUES;

-- ----------------------------------------------------------------------------
-- PART B + PART F: extend crm.staff_can() with two new permissions.
--
--   manage_settings     — super_user + admin only. (super_user falls through
--                         to TRUE; admin falls through via its NOT IN catch-all;
--                         every other role falls through to FALSE.) No explicit
--                         branch required, but documented here for the reader.
--   manage_appointments — super_user, admin, rcic, reception. rcic and
--                         reception need explicit entries below; document_officer
--                         and readonly intentionally omitted (read-only access
--                         via the appointments SELECT policy, no write).
--
-- Body is otherwise copied verbatim from
-- 20260509000002_restrict_doc_review_to_admin_rcic.sql.
-- ----------------------------------------------------------------------------

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
        RETURN (v_override::text)::boolean;
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
            'manage_appointments'
        )
        -- Document Officer: upload only, NO review. Approval/rejection is
        -- reserved for admin + RCIC so the officer can't sign off on
        -- their own work.
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
            'manage_appointments'
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

-- ----------------------------------------------------------------------------
-- PART C: appointment_types
-- ----------------------------------------------------------------------------

CREATE TABLE crm.appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    duration_minutes INT NOT NULL
        CHECK (duration_minutes BETWEEN 15 AND 240),
    description TEXT,

    is_public BOOLEAN NOT NULL DEFAULT false,
    requires_case BOOLEAN NOT NULL DEFAULT false,

    default_location_type TEXT NOT NULL DEFAULT 'online'
        CHECK (default_location_type IN ('online', 'onsite')),

    fee_cad NUMERIC(10,2),

    display_order INT NOT NULL DEFAULT 100,
    active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_appointment_types_active
    ON crm.appointment_types(active, display_order)
    WHERE deleted_at IS NULL;

ALTER TABLE crm.appointment_types ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read only active, public types (for the booking page)
CREATE POLICY anyone_read_active_public_types
    ON crm.appointment_types FOR SELECT
    USING (active = true AND is_public = true AND deleted_at IS NULL);

-- Staff read all types
CREATE POLICY staff_read_all_types
    ON crm.appointment_types FOR SELECT
    USING (crm.current_staff_role() IS NOT NULL);

CREATE POLICY admin_manage_types
    ON crm.appointment_types FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_settings'));

CREATE POLICY service_role_types
    ON crm.appointment_types FOR ALL TO service_role USING (true);

GRANT SELECT ON crm.appointment_types TO authenticated, anon;
GRANT ALL ON crm.appointment_types TO service_role;

CREATE TRIGGER trg_updated_appointment_types
    BEFORE UPDATE ON crm.appointment_types
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE TRIGGER trg_audit_appointment_types
    AFTER INSERT OR UPDATE OR DELETE ON crm.appointment_types
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- Seed three default types
INSERT INTO crm.appointment_types
    (name, code, duration_minutes, description, is_public,
     requires_case, default_location_type, display_order)
VALUES
    ('Initial Consultation', 'consult', 30,
     'A 30-minute consultation to discuss your immigration options.',
     true, false, 'online', 10),
    ('Case Review Meeting', 'case_review', 60,
     'A meeting to review documents and discuss case progress.',
     false, true, 'onsite', 20),
    ('Retainer Signing', 'retainer_sign', 30,
     'An in-person meeting to sign the retainer agreement.',
     false, true, 'onsite', 30);

-- ----------------------------------------------------------------------------
-- PART D: appointment enums
-- ----------------------------------------------------------------------------

CREATE TYPE crm.appointment_status AS ENUM (
    'confirmed',
    'rescheduled',
    'cancelled',
    'completed',
    'no_show'
);

CREATE TYPE crm.appointment_booking_source AS ENUM (
    'staff',
    'public_portal',
    'manual_import'
);

-- ----------------------------------------------------------------------------
-- PART E: appointments
-- ----------------------------------------------------------------------------

CREATE TABLE crm.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_type_id UUID NOT NULL
        REFERENCES crm.appointment_types(id),

    -- Linkages (both optional: consultations may have no case;
    -- public bookings may create a lead client)
    client_id UUID REFERENCES crm.clients(id),
    case_id UUID REFERENCES crm.cases(id),

    -- Client snapshot at booking time
    snapshot_client_name TEXT NOT NULL,
    snapshot_client_email TEXT NOT NULL,
    snapshot_client_phone TEXT,

    -- Time (stored as timestamptz in UTC; timezone column for display)
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Toronto',

    -- Location
    location_type TEXT NOT NULL
        CHECK (location_type IN ('online', 'onsite')),
    online_link TEXT,
    onsite_address TEXT,

    -- Teams (populated by APPT-2 when teams_auto_create is on; null now)
    teams_join_url TEXT,
    teams_meeting_id TEXT,

    -- Assignment (future-proof; nullable in global mode)
    assigned_staff_id UUID REFERENCES crm.staff(id),

    reason TEXT,
    staff_notes TEXT,

    status crm.appointment_status NOT NULL DEFAULT 'confirmed',
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES crm.staff(id),
    cancelled_at TIMESTAMPTZ,
    rescheduled_to UUID REFERENCES crm.appointments(id),

    booking_source crm.appointment_booking_source NOT NULL DEFAULT 'staff',

    -- Public reschedule/cancel token (set only for public_portal bookings)
    management_token TEXT UNIQUE,
    management_token_expires_at TIMESTAMPTZ,

    -- Calendar sync state (populated by APPT-2)
    graph_event_id TEXT,
    graph_event_etag TEXT,
    graph_sync_status TEXT
        CHECK (graph_sync_status IS NULL OR graph_sync_status IN
            ('pending', 'synced', 'failed', 'disabled')),
    graph_sync_error TEXT,
    graph_synced_at TIMESTAMPTZ,

    confirmation_email_sent_at TIMESTAMPTZ,
    reminder_email_sent_at TIMESTAMPTZ,

    created_by UUID REFERENCES crm.staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT appt_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX idx_appointments_starts_at
    ON crm.appointments(starts_at)
    WHERE deleted_at IS NULL AND status = 'confirmed';

CREATE INDEX idx_appointments_client
    ON crm.appointments(client_id)
    WHERE deleted_at IS NULL AND client_id IS NOT NULL;

CREATE INDEX idx_appointments_case
    ON crm.appointments(case_id)
    WHERE deleted_at IS NULL AND case_id IS NOT NULL;

CREATE INDEX idx_appointments_assigned_staff
    ON crm.appointments(assigned_staff_id)
    WHERE deleted_at IS NULL AND assigned_staff_id IS NOT NULL;

CREATE INDEX idx_appointments_management_token
    ON crm.appointments(management_token)
    WHERE management_token IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE crm.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_read_appointments
    ON crm.appointments FOR SELECT
    USING (crm.current_staff_role() IS NOT NULL);

CREATE POLICY staff_manage_appointments
    ON crm.appointments FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_appointments'));

CREATE POLICY service_role_appointments
    ON crm.appointments FOR ALL TO service_role USING (true);

GRANT SELECT ON crm.appointments TO authenticated;
GRANT ALL ON crm.appointments TO service_role;

CREATE TRIGGER trg_updated_appointments
    BEFORE UPDATE ON crm.appointments
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE TRIGGER trg_audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON crm.appointments
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

-- ----------------------------------------------------------------------------
-- PART G: overlap-prevention function (global mode)
--
-- Global-mode only; ignores assigned_staff_id. A per-staff overload comes
-- later if booking_mode flips to per_staff.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.appointment_slot_is_free(
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INT;
BEGIN
    SELECT count(*) INTO v_conflict_count
    FROM crm.appointments
    WHERE deleted_at IS NULL
      AND status = 'confirmed'
      AND (p_exclude_appointment_id IS NULL OR id <> p_exclude_appointment_id)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at;

    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION crm.appointment_slot_is_free
    TO authenticated, service_role;
