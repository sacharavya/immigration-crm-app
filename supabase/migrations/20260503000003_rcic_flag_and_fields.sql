-- ============================================================================
-- RCIC flag + per-staff RCIC fields. Until now the retainer agreement
-- pulled the RCIC name from the case's assigned_rcic but hardcoded the
-- membership number, office address, phone, and email — which produced
-- a mismatched document when the assignee wasn't actually a regulated
-- consultant.
--
-- Adds:
--   - crm.staff.is_rcic BOOLEAN — flags who can counter-sign retainers
--   - crm.staff.rcic_membership_number TEXT — only meaningful when is_rcic
--   - crm.staff.office_address / office_phone / cell_phone TEXT — populate
--     the agreement's contact section
--
--   - crm.retainer_agreements.rcic_id UUID REFERENCES crm.staff(id) —
--     locks in which RCIC will counter-sign this specific retainer.
--     Decoupled from cases.assigned_rcic so a paralegal/admin can manage
--     the case while the actual RCIC is recorded on the agreement.
--
-- Reversibility: ALTER TABLE ... DROP COLUMN both rolls back. The new
-- columns are nullable; no data migration required.
-- ============================================================================

ALTER TABLE crm.staff
    ADD COLUMN IF NOT EXISTS is_rcic                  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS rcic_membership_number   TEXT,
    ADD COLUMN IF NOT EXISTS office_address           TEXT,
    ADD COLUMN IF NOT EXISTS office_phone             TEXT,
    ADD COLUMN IF NOT EXISTS cell_phone               TEXT;

-- Sanity constraint: a non-RCIC must not carry a membership number.
-- Allows staff to clear is_rcic without first nulling the field, and
-- prevents accidental membership numbers floating on regular staff.
ALTER TABLE crm.staff
    DROP CONSTRAINT IF EXISTS staff_rcic_membership_number_only_if_rcic;
ALTER TABLE crm.staff
    ADD CONSTRAINT staff_rcic_membership_number_only_if_rcic
    CHECK (rcic_membership_number IS NULL OR is_rcic);

-- Per-retainer RCIC lock-in.
ALTER TABLE crm.retainer_agreements
    ADD COLUMN IF NOT EXISTS rcic_id UUID REFERENCES crm.staff(id);

CREATE INDEX IF NOT EXISTS idx_retainer_rcic
    ON crm.retainer_agreements(rcic_id)
    WHERE deleted_at IS NULL;
