-- FORMS-1: versioned registry of official immigration forms (IRCC IMM,
-- provincial) and firm templates, plus generated fills per case participant.
--
-- Permission model: 'manage_forms' gates all writes on forms and
-- form_versions. crm.staff_can() needs NO change for it: super_user returns
-- TRUE for everything, admin returns TRUE for anything outside its explicit
-- deny list, and rcic / reception / document_officer / readonly use
-- allowlists that do not include it. Mirrored in src/lib/auth/permissions.ts.
--
-- Blank PDFs live on OneDrive under "Forms Library/<form number>/" in the
-- firm document library (same storage as case files); rows store the
-- SharePoint drive/item ids like files.documents does.

-- ---------------------------------------------------------------------------
-- forms: one row per form identity (number + issuing body), versions below.
-- ---------------------------------------------------------------------------
CREATE TABLE crm.forms (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_number  TEXT NOT NULL,
    title        TEXT NOT NULL,
    issuing_body TEXT NOT NULL CHECK (issuing_body IN
        ('ircc', 'oinp', 'bcpnp', 'aaip', 'sinp', 'other_province', 'firm')),
    form_type    TEXT NOT NULL CHECK (form_type IN
        ('xfa', 'acroform', 'portal_reference')),
    program_tags TEXT[] NOT NULL DEFAULT '{}',
    -- global = official form maintained by the vendor; firm = firm template.
    scope        TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'firm')),
    -- Dormant until multi-tenancy lands: no firms table exists yet, so no FK.
    firm_id      UUID,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One global registry entry per form number (firm templates may reuse names).
CREATE UNIQUE INDEX idx_forms_global_number
    ON crm.forms (lower(form_number)) WHERE scope = 'global';
CREATE INDEX idx_forms_issuing_body ON crm.forms (issuing_body);

CREATE TRIGGER trg_updated_forms BEFORE UPDATE ON crm.forms
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- ---------------------------------------------------------------------------
-- form_versions: one row per uploaded revision of a form.
-- ---------------------------------------------------------------------------
CREATE TABLE crm.form_versions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id             UUID NOT NULL REFERENCES crm.forms(id) ON DELETE CASCADE,
    -- The revision printed on the form, e.g. "08-2023".
    version_label       TEXT NOT NULL,
    -- Blank PDF location on OneDrive (Forms Library folder).
    sharepoint_drive_id TEXT,
    sharepoint_item_id  TEXT,
    sharepoint_web_url  TEXT,
    file_name           TEXT,
    file_size_bytes     BIGINT,
    file_sha256         TEXT NOT NULL,
    published_at        DATE,
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN
        ('draft', 'active', 'deprecated')),
    activated_at        TIMESTAMPTZ,
    superseded_at       TIMESTAMPTZ,
    -- FORMS-2 fills these: extracted field list and diff vs previous version.
    field_schema_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
    diff_json           JSONB,
    -- FORMS-3 fills this: form field path -> profile path mapping.
    mapping_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes               TEXT,
    created_by          UUID REFERENCES crm.staff(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (form_id, version_label),
    -- Rejects re-uploading identical bytes as a new revision of this form.
    UNIQUE (form_id, file_sha256)
);

-- At most one active version per form.
CREATE UNIQUE INDEX idx_form_versions_one_active
    ON crm.form_versions (form_id) WHERE status = 'active';
CREATE INDEX idx_form_versions_form ON crm.form_versions (form_id);

-- Activation lifecycle, enforced at the row level:
--   draft -> active: requires stored file + required-mapping gate, stamps
--     activated_at, and deprecates the previously active version.
--   active -> deprecated: stamps superseded_at.
-- The required-mapping gate: every mapping_json entry with required = true
-- must resolve from profile, constant, or be explicitly manual. Entries left
-- unmapped or broken by a version diff block activation. An empty mapping
-- passes (no extraction yet, or a portal_reference form).
CREATE OR REPLACE FUNCTION crm.form_version_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
        IF NEW.sharepoint_item_id IS NULL THEN
            RAISE EXCEPTION 'Cannot activate a version with no stored file';
        END IF;
        IF EXISTS (
            SELECT 1
            FROM jsonb_each(COALESCE(NEW.mapping_json, '{}'::jsonb)) AS m(path, cfg)
            WHERE COALESCE((cfg ->> 'required')::boolean, FALSE)
              AND COALESCE(cfg ->> 'source', '') NOT IN ('profile', 'constant', 'manual')
        ) THEN
            RAISE EXCEPTION 'Cannot activate: required form fields are unmapped';
        END IF;
        NEW.activated_at := now();
        UPDATE crm.form_versions
           SET status = 'deprecated', superseded_at = now()
         WHERE form_id = NEW.form_id AND status = 'active' AND id <> NEW.id;
    END IF;

    IF NEW.status = 'deprecated' AND OLD.status = 'active'
       AND NEW.superseded_at IS NULL THEN
        NEW.superseded_at := now();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_form_version_lifecycle
    BEFORE UPDATE ON crm.form_versions
    FOR EACH ROW EXECUTE FUNCTION crm.form_version_lifecycle();

-- ---------------------------------------------------------------------------
-- form_fills: immutable record of every generated fill.
-- ---------------------------------------------------------------------------
CREATE TABLE crm.form_fills (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_version_id       UUID NOT NULL REFERENCES crm.form_versions(id),
    case_id               UUID NOT NULL REFERENCES crm.cases(id),
    participant_id        UUID NOT NULL REFERENCES crm.case_participants(id),
    -- Exact profile data used at generation time.
    profile_snapshot_json JSONB NOT NULL,
    -- Output PDF in the case's Final folder on OneDrive.
    sharepoint_drive_id   TEXT,
    sharepoint_item_id    TEXT,
    sharepoint_web_url    TEXT,
    file_name             TEXT,
    -- Fields left blank and why: [{ path, reason }].
    unmapped_fields       JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_by          UUID REFERENCES crm.staff(id),
    generated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_fills_case ON crm.form_fills (case_id);
CREATE INDEX idx_form_fills_version ON crm.form_fills (form_version_id);

-- Immutable after insert: an audit artifact, like crm.case_events.
CREATE OR REPLACE FUNCTION crm.form_fills_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'form_fills rows are immutable';
END;
$$;

CREATE TRIGGER trg_form_fills_immutable
    BEFORE UPDATE OR DELETE ON crm.form_fills
    FOR EACH ROW EXECUTE FUNCTION crm.form_fills_immutable();

-- ---------------------------------------------------------------------------
-- RLS. Schema-wide default privileges from 20260501000002 already grant
-- table access to authenticated; policies are the gate.
-- ---------------------------------------------------------------------------
ALTER TABLE crm.forms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.form_versions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.form_fills     ENABLE ROW LEVEL SECURITY;

-- Registry: readable by any active staff member, writable by manage_forms.
-- Single-tenant today, so no firm_id scoping in the read policy yet.
CREATE POLICY forms_select ON crm.forms
    FOR SELECT USING (crm.current_staff_id() IS NOT NULL);
CREATE POLICY forms_insert ON crm.forms
    FOR INSERT WITH CHECK (crm.staff_can(auth.uid(), 'manage_forms'));
CREATE POLICY forms_update ON crm.forms
    FOR UPDATE USING (crm.staff_can(auth.uid(), 'manage_forms'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_forms'));
CREATE POLICY forms_delete ON crm.forms
    FOR DELETE USING (crm.staff_can(auth.uid(), 'manage_forms'));

CREATE POLICY form_versions_select ON crm.form_versions
    FOR SELECT USING (crm.current_staff_id() IS NOT NULL);
CREATE POLICY form_versions_insert ON crm.form_versions
    FOR INSERT WITH CHECK (crm.staff_can(auth.uid(), 'manage_forms'));
CREATE POLICY form_versions_update ON crm.form_versions
    FOR UPDATE USING (crm.staff_can(auth.uid(), 'manage_forms'))
    WITH CHECK (crm.staff_can(auth.uid(), 'manage_forms'));
CREATE POLICY form_versions_delete ON crm.form_versions
    FOR DELETE USING (crm.staff_can(auth.uid(), 'manage_forms'));

-- Fills follow the case's access rules (mirrors crm.cases policies).
-- No UPDATE or DELETE policies: rows are immutable, and the trigger above
-- backstops even service-role writes.
CREATE POLICY form_fills_select ON crm.form_fills
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_cases'));
CREATE POLICY form_fills_insert ON crm.form_fills
    FOR INSERT WITH CHECK (crm.staff_can(auth.uid(), 'edit_cases'));
