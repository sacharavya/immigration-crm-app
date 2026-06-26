-- ============================================================================
-- Case team: RCIC of record + case worker(s)
--
-- Replaces the single-slot assignment model (crm.cases.assigned_rcic plus the
-- unused assigned_paralegal) with an explicit team made of role-tagged
-- assignments:
--
--   * exactly one rcic_of_record  (the licensed consultant named to IRCC as the
--     authorized representative; must be a staff member with is_rcic = TRUE), and
--   * one or more case_worker      (any staff member handling the file).
--
-- crm.cases.assigned_rcic is RETAINED and kept authoritative: a trigger mirrors
-- the current rcic_of_record assignment back onto that column, so every existing
-- reader (retainer / IRCC PDFs, the public signing flow, reports, and the case /
-- client / archive list filters) keeps working untouched.
--
-- No new permission is introduced. Reads are gated on view_cases and writes on
-- edit_cases via crm.staff_can(), composing existing permissions only, so no
-- TS/SQL lock-step is needed.
-- ============================================================================

CREATE TYPE crm.case_team_role AS ENUM ('rcic_of_record', 'case_worker');

CREATE TABLE crm.case_assignments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id    UUID NOT NULL REFERENCES crm.cases(id) ON DELETE CASCADE,
    staff_id   UUID NOT NULL REFERENCES crm.staff(id),
    role       crm.case_team_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES crm.staff(id)
);

-- Exactly one RCIC of record per case.
CREATE UNIQUE INDEX uq_case_one_rcic
    ON crm.case_assignments (case_id)
    WHERE role = 'rcic_of_record';

-- The same person cannot hold the same role twice on one case.
CREATE UNIQUE INDEX uq_case_staff_role
    ON crm.case_assignments (case_id, staff_id, role);

CREATE INDEX idx_case_assignments_staff ON crm.case_assignments (staff_id);
CREATE INDEX idx_case_assignments_case  ON crm.case_assignments (case_id);

-- ---------------------------------------------------------------------------
-- Backfill BEFORE the validation trigger exists, so legacy data (a case whose
-- assigned_rcic somehow lost its is_rcic flag) cannot block the migration.
-- ---------------------------------------------------------------------------

-- RCIC of record from the existing column.
INSERT INTO crm.case_assignments (case_id, staff_id, role, created_by)
SELECT id, assigned_rcic, 'rcic_of_record', created_by
FROM crm.cases
WHERE assigned_rcic IS NOT NULL;

-- One worker per case: the old paralegal if set, else the creator, else the
-- RCIC (who then doubles as the handler). Guarantees the at-least-one-worker
-- invariant for every existing case.
INSERT INTO crm.case_assignments (case_id, staff_id, role, created_by)
SELECT id, COALESCE(assigned_paralegal, created_by, assigned_rcic), 'case_worker', created_by
FROM crm.cases
WHERE COALESCE(assigned_paralegal, created_by, assigned_rcic) IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Validation: the RCIC of record must be a licensed consultant. A CHECK cannot
-- cross to crm.staff, so this is enforced by a BEFORE trigger. Defense in depth
-- behind the server-action check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.validate_case_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_rcic BOOLEAN;
BEGIN
    IF NEW.role = 'rcic_of_record' THEN
        SELECT is_rcic INTO v_is_rcic FROM crm.staff WHERE id = NEW.staff_id;
        IF NOT COALESCE(v_is_rcic, FALSE) THEN
            RAISE EXCEPTION
                'RCIC of record must be a licensed consultant (staff.is_rcic = TRUE)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_case_assignment
    BEFORE INSERT OR UPDATE ON crm.case_assignments
    FOR EACH ROW
    EXECUTE FUNCTION crm.validate_case_assignment();

-- ---------------------------------------------------------------------------
-- Sync: keep crm.cases.assigned_rcic equal to the current rcic_of_record row so
-- the header fact, the rail panel, and every legacy reader cannot disagree.
-- SECURITY DEFINER so it can write crm.cases regardless of caller role.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.sync_case_rcic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.role = 'rcic_of_record' THEN
        UPDATE crm.cases
           SET assigned_rcic = NEW.staff_id
         WHERE id = NEW.case_id
           AND assigned_rcic IS DISTINCT FROM NEW.staff_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_case_rcic
    AFTER INSERT OR UPDATE ON crm.case_assignments
    FOR EACH ROW
    EXECUTE FUNCTION crm.sync_case_rcic();

-- ---------------------------------------------------------------------------
-- Grants + RLS. The schema-wide GRANT in 20260501000002 only covered tables
-- that existed then, so grant this new table explicitly.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON crm.case_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.case_assignments TO service_role;

ALTER TABLE crm.case_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_assignments_select ON crm.case_assignments
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_cases'));

CREATE POLICY case_assignments_write ON crm.case_assignments
    FOR ALL
    USING (crm.staff_can(auth.uid(), 'edit_cases'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_cases'));
