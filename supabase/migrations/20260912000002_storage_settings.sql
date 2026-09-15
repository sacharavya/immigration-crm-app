-- Storage settings: firm-wide control over WHERE case files are stored.
--
-- Before this migration the document library id and the root folder were
-- env-only (GRAPH_DOCUMENT_LIBRARY_ID / GRAPH_ROOT_FOLDER), so moving the
-- firm's files to a different library or sandbox folder meant a redeploy.
-- They now live in a singleton config row that admins edit in the UI, with
-- the env vars kept as a fallback so existing deployments keep working
-- until someone saves the settings page for the first time.
--
-- `provider` is the switch between storage backends. Only 'onedrive' has an
-- adapter today; 'google_drive' is accepted by the schema so the column
-- doesn't need a migration when that adapter lands, and the application
-- refuses to run against a provider it can't talk to.

CREATE TYPE crm.storage_provider AS ENUM ('onedrive', 'google_drive');

CREATE TABLE crm.storage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider crm.storage_provider NOT NULL DEFAULT 'onedrive',

    -- OneDrive/SharePoint: the drive id of the document library.
    -- Google Drive: the shared drive id (blank = "My Drive" of the
    -- service account). NULL means "fall back to the env var".
    drive_id TEXT,

    -- Optional path prefix that anchors every case folder, e.g.
    -- "Test-CRM" or "Sandbox/Cases". Blank anchors at the drive root.
    -- Slashes nest; each segment is sanitized by the application.
    root_folder TEXT NOT NULL DEFAULT '',

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES crm.staff(id)
);

COMMENT ON COLUMN crm.storage_settings.drive_id IS
    'Document library / shared drive id. NULL falls back to GRAPH_DOCUMENT_LIBRARY_ID.';
COMMENT ON COLUMN crm.storage_settings.root_folder IS
    'Path prefix anchoring case folders. Blank anchors at the drive root.';

-- Enforce exactly one row (same singleton pattern as appointment_settings).
CREATE UNIQUE INDEX idx_storage_settings_singleton
    ON crm.storage_settings ((true));

ALTER TABLE crm.storage_settings ENABLE ROW LEVEL SECURITY;

-- Any staff member may read it (upload UI shows the destination); only
-- manage_settings holders may change it. Mirrors appointment_settings.
CREATE POLICY staff_read_storage_settings
    ON crm.storage_settings FOR SELECT
    USING (crm.current_staff_role() IS NOT NULL);

CREATE POLICY admin_manage_storage_settings
    ON crm.storage_settings FOR ALL
    USING (crm.staff_can(auth.uid(), 'manage_settings'));

CREATE POLICY service_role_storage_settings
    ON crm.storage_settings FOR ALL TO service_role USING (true);

GRANT SELECT ON crm.storage_settings TO authenticated;
GRANT ALL ON crm.storage_settings TO service_role;

CREATE TRIGGER trg_updated_storage_settings
    BEFORE UPDATE ON crm.storage_settings
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

CREATE TRIGGER trg_audit_storage_settings
    AFTER INSERT OR UPDATE OR DELETE ON crm.storage_settings
    FOR EACH ROW EXECUTE FUNCTION audit.log_change();

INSERT INTO crm.storage_settings DEFAULT VALUES;
