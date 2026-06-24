-- ============================================================================
-- Client immigration status tracking.
--
-- Stores the client's current immigration status in Canada and its expiry
-- date. Used by the worklist page to surface clients whose status is
-- expiring and to compute urgency tiers.
--
-- Permanent residents and citizens have no expiry. Null means "not on file"
-- and renders as an inline Add affordance in the worklist.
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE crm.immigration_status_type AS ENUM (
        'study_permit',
        'work_permit',
        'pgwp',
        'visitor_record',
        'visitor',
        'bridging_owp',
        'permanent_resident',
        'citizen',
        'refugee_claimant',
        'no_status',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS immigration_status crm.immigration_status_type,
    ADD COLUMN IF NOT EXISTS immigration_status_expiry DATE,
    ADD COLUMN IF NOT EXISTS immigration_status_note TEXT;

COMMENT ON COLUMN crm.clients.immigration_status IS
    'Current immigration status in Canada. Null = not on file.';
COMMENT ON COLUMN crm.clients.immigration_status_expiry IS
    'Expiry date of the current status. Null for PR, citizen, or unknown.';
COMMENT ON COLUMN crm.clients.immigration_status_note IS
    'Optional note about the immigration status (e.g. LMIA details, permit conditions).';

CREATE INDEX IF NOT EXISTS idx_clients_immigration_expiry
    ON crm.clients(immigration_status_expiry)
    WHERE deleted_at IS NULL AND immigration_status_expiry IS NOT NULL;
