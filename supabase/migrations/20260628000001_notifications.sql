-- ============================================================================
-- In-app notifications
--
-- A per-staff notification feed surfaced as a bell in the staff chrome. Rows are
-- created AUTOMATICALLY by a trigger on crm.case_events (the immutable case
-- activity log), fanned out to the case's assigned team (crm.case_assignments),
-- excluding the actor who caused the event. There is no email here — this is the
-- in-app channel only.
--
-- No new permission: every staff member sees only their OWN notifications, gated
-- by auth via the existing crm.current_staff_id() helper. Inserts come solely
-- from the SECURITY DEFINER trigger (no INSERT policy / grant for authenticated),
-- so the feed cannot be spoofed.
--
-- Delivery is polled by the client today; the table is shaped so a Realtime
-- subscription can be added later with no schema change.
-- ============================================================================

CREATE TYPE crm.notification_type AS ENUM (
    'case_status_changed',
    'document_received',
    'document_accepted',
    'document_rejected',
    'document_requested',
    'phase_blocked',
    'deadline_set',
    'deadline_missed',
    'fee_collected',
    'task_assigned'
);

CREATE TABLE crm.notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id        UUID NOT NULL REFERENCES crm.staff(id) ON DELETE CASCADE,
    type            crm.notification_type NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT,
    case_id         UUID REFERENCES crm.cases(id) ON DELETE CASCADE,
    source_event_id UUID REFERENCES crm.case_events(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES crm.staff(id),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot path: the unread badge + unread feed for one staff member.
CREATE INDEX idx_notifications_unread
    ON crm.notifications (staff_id, created_at DESC) WHERE read_at IS NULL;
-- Full history for the dropdown (read + unread).
CREATE INDEX idx_notifications_all
    ON crm.notifications (staff_id, created_at DESC);

-- The schema-wide grant in 20260501000002 only covered tables that existed then.
-- authenticated gets SELECT + UPDATE (mark read); never INSERT — rows are minted
-- only by the trigger below. service_role keeps full access for cleanup jobs.
GRANT SELECT, UPDATE                 ON crm.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.notifications TO service_role;

ALTER TABLE crm.notifications ENABLE ROW LEVEL SECURITY;

-- Read / update own rows only. crm.current_staff_id() maps auth.uid() -> staff.id
-- (defined in 20260501000001). No INSERT or DELETE policy by design.
CREATE POLICY notifications_select_own ON crm.notifications
    FOR SELECT USING (staff_id = crm.current_staff_id());

CREATE POLICY notifications_update_own ON crm.notifications
    FOR UPDATE USING (staff_id = crm.current_staff_id())
    WITH CHECK  (staff_id = crm.current_staff_id());

-- ---------------------------------------------------------------------------
-- Fan-out: each notifiable case_events row -> one notification per assigned
-- staff member (minus the actor). Unmapped event types fall through untouched,
-- so this trigger never blocks a case_events insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.fanout_case_event_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_type  crm.notification_type;
    v_title TEXT;
BEGIN
    CASE NEW.event_type
        WHEN 'status_changed'        THEN v_type := 'case_status_changed'; v_title := 'Case status changed';
        WHEN 'document_received'     THEN v_type := 'document_received';   v_title := 'Document received';
        WHEN 'document_accepted'     THEN v_type := 'document_accepted';   v_title := 'Document accepted';
        WHEN 'document_rejected'     THEN v_type := 'document_rejected';   v_title := 'Document rejected';
        WHEN 'document_requested'    THEN v_type := 'document_requested';  v_title := 'Document requested';
        WHEN 'phase_advance_blocked' THEN v_type := 'phase_blocked';       v_title := 'Phase advance blocked';
        WHEN 'deadline_set'          THEN v_type := 'deadline_set';        v_title := 'Deadline set';
        WHEN 'deadline_missed'       THEN v_type := 'deadline_missed';     v_title := 'Deadline missed';
        WHEN 'fee_collected'         THEN v_type := 'fee_collected';       v_title := 'Payment recorded';
        ELSE
            RETURN NEW;  -- note_added, ircc_update, etc. are not notifiable (yet)
    END CASE;

    INSERT INTO crm.notifications (
        staff_id, type, title, body, case_id, source_event_id, actor_id
    )
    SELECT DISTINCT
        ca.staff_id, v_type, v_title, NEW.description, NEW.case_id, NEW.id, NEW.created_by
    FROM crm.case_assignments ca
    JOIN crm.staff s
      ON s.id = ca.staff_id
     AND s.deleted_at IS NULL
     AND s.is_active = TRUE
    WHERE ca.case_id = NEW.case_id
      AND ca.staff_id IS DISTINCT FROM NEW.created_by;  -- don't notify the actor

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_case_event_notify
    AFTER INSERT ON crm.case_events
    FOR EACH ROW
    EXECUTE FUNCTION crm.fanout_case_event_notifications();

-- ---------------------------------------------------------------------------
-- Task assignment: notify the assignee when a task is assigned (on insert, or
-- when assigned_to changes). The assigner (created_by) is never notified.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.assigned_to IS NULL THEN
        RETURN NEW;
    END IF;

    -- On UPDATE only fire when the assignee actually changed.
    IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
        RETURN NEW;
    END IF;

    -- Don't notify someone for assigning a task to themselves.
    IF NEW.assigned_to IS NOT DISTINCT FROM NEW.created_by THEN
        RETURN NEW;
    END IF;

    INSERT INTO crm.notifications (staff_id, type, title, body, case_id, actor_id)
    SELECT NEW.assigned_to, 'task_assigned', 'Task assigned to you', NEW.title,
           NEW.case_id, NEW.created_by
    FROM crm.staff s
    WHERE s.id = NEW.assigned_to AND s.deleted_at IS NULL AND s.is_active = TRUE;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_task_assignment_notify
    AFTER INSERT OR UPDATE OF assigned_to ON crm.tasks
    FOR EACH ROW
    EXECUTE FUNCTION crm.notify_task_assignment();
