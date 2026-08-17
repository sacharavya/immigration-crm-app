-- ============================================================================
-- Submission package builder (staff-only)
--
-- Staff assemble selected case documents (from the case's OneDrive folder) into
-- a single merged, compressed, linearized PDF saved to a "Final" subfolder.
-- A background worker (service role) does the heavy lifting; these tables are
-- the job queue + history. Source documents are never modified.
--
-- RLS: authenticated ACTIVE staff only (crm.current_staff_id() gate); no
-- anonymous access. The worker uses the service role key, which bypasses RLS.
-- ============================================================================

CREATE TYPE crm.package_status AS ENUM (
  'draft',
  'queued',
  'processing',
  'complete',
  'needs_attention',
  'failed'
);

-- ---------------------------------------------------------------------------
-- size_presets: named IRCC/OINP/email size targets. target/ceiling null means
-- "merge only, no compression".
-- ---------------------------------------------------------------------------
CREATE TABLE crm.size_presets (
  key           TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  target_bytes  BIGINT,
  ceiling_bytes BIGINT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 100
);

INSERT INTO crm.size_presets (key, label, target_bytes, ceiling_bytes, display_order) VALUES
  ('ircc_portal', 'IRCC portal',       3500000,  4000000,  10),
  ('ircc_2mb',    'IRCC 2 MB contexts',1800000,  2000000,  20),
  ('oinp_efiling','OINP e-Filing',      9000000, 10000000,  30),
  ('email',       'Email',            18000000, 20000000,  40),
  ('merge_only',  'Merge only (no compression)', NULL, NULL, 50);

-- ---------------------------------------------------------------------------
-- packages: one build job / output per row.
-- ---------------------------------------------------------------------------
CREATE TABLE crm.packages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                 UUID NOT NULL REFERENCES crm.cases(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  preset_key              TEXT NOT NULL REFERENCES crm.size_presets(key),
  status                  crm.package_status NOT NULL DEFAULT 'draft',
  output_onedrive_item_id TEXT,
  failure_reason          TEXT,
  -- Retry bookkeeping for the stuck-job watchdog (processing > 10 min).
  attempts                INT NOT NULL DEFAULT 0,
  created_by              UUID REFERENCES crm.staff(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker poller hot path: the oldest queued job.
CREATE INDEX idx_packages_queued
  ON crm.packages (created_at) WHERE status = 'queued';
-- Watchdog: find stuck processing jobs by updated_at.
CREATE INDEX idx_packages_processing
  ON crm.packages (updated_at) WHERE status = 'processing';
CREATE INDEX idx_packages_case ON crm.packages (case_id, created_at DESC);

CREATE TRIGGER trg_updated_packages
  BEFORE UPDATE ON crm.packages
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- ---------------------------------------------------------------------------
-- package_items: the ordered source documents in a package.
-- ---------------------------------------------------------------------------
CREATE TABLE crm.package_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id              UUID NOT NULL REFERENCES crm.packages(id) ON DELETE CASCADE,
  source_onedrive_item_id TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  sort_order              INT NOT NULL,
  size_bytes              BIGINT
);

CREATE INDEX idx_package_items_package
  ON crm.package_items (package_id, sort_order);

-- ---------------------------------------------------------------------------
-- Grants + RLS. The schema-wide grant in 20260501000002 only covered tables
-- that existed then, so grant these explicitly.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.packages       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.package_items  TO authenticated;
GRANT SELECT                          ON crm.size_presets   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.packages       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.package_items  TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.size_presets   TO service_role;

ALTER TABLE crm.packages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.size_presets  ENABLE ROW LEVEL SECURITY;

-- Active staff only (crm.current_staff_id() returns null for anon / non-staff).
CREATE POLICY packages_staff_all ON crm.packages
  FOR ALL
  USING (crm.current_staff_id() IS NOT NULL)
  WITH CHECK (crm.current_staff_id() IS NOT NULL);

CREATE POLICY package_items_staff_all ON crm.package_items
  FOR ALL
  USING (crm.current_staff_id() IS NOT NULL)
  WITH CHECK (crm.current_staff_id() IS NOT NULL);

CREATE POLICY size_presets_staff_read ON crm.size_presets
  FOR SELECT
  USING (crm.current_staff_id() IS NOT NULL);
