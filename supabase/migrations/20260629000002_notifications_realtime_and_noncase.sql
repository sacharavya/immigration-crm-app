-- ============================================================================
-- Notifications: Realtime + non-case sources (appointments, new leads)
--
-- 1. Adds a generic `link` deep-link column (case events still also set case_id).
-- 2. Adds crm.staff_ids_with_permission() so non-case events can fan out to
--    everyone who holds a permission (there is no case team to target).
-- 3. Triggers for appointment-booked and new-lead, mirroring the case-event
--    fan-out (actor excluded via the row's created_by).
-- 4. Publishes crm.notifications on supabase_realtime so the bell can subscribe
--    instead of polling.
-- ============================================================================

ALTER TABLE crm.notifications ADD COLUMN IF NOT EXISTS link TEXT;

-- ---------------------------------------------------------------------------
-- Fan-out helper: every active staff member who holds p_permission. Reuses the
-- canonical crm.staff_can() so the audience always matches RLS / the UI.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.staff_ids_with_permission(p_permission TEXT)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT s.id
  FROM crm.staff s
  WHERE s.deleted_at IS NULL
    AND s.is_active = TRUE
    AND crm.staff_can(s.auth_user_id, p_permission);
$$;

-- ---------------------------------------------------------------------------
-- Case events: same as before, now also writing the deep link.
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
            RETURN NEW;
    END CASE;

    INSERT INTO crm.notifications (
        staff_id, type, title, body, case_id, source_event_id, actor_id, link
    )
    SELECT DISTINCT
        ca.staff_id, v_type, v_title, NEW.description, NEW.case_id, NEW.id, NEW.created_by,
        '/dashboard/cases/' || NEW.case_id
    FROM crm.case_assignments ca
    JOIN crm.staff s
      ON s.id = ca.staff_id
     AND s.deleted_at IS NULL
     AND s.is_active = TRUE
    WHERE ca.case_id = NEW.case_id
      AND ca.staff_id IS DISTINCT FROM NEW.created_by;

    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Appointment booked: notify the assigned staff member if set, otherwise every
-- staff member who can manage appointments. The booker (created_by, null for
-- public bookings) is never notified.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.notify_appointment_booked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_body TEXT;
BEGIN
    v_body := NEW.snapshot_client_name || ' — ' ||
        to_char(
            NEW.starts_at AT TIME ZONE COALESCE(NEW.timezone, 'America/Toronto'),
            'FMMon FMDD, HH24:MI'
        );

    IF NEW.assigned_staff_id IS NOT NULL THEN
        INSERT INTO crm.notifications (staff_id, type, title, body, actor_id, link)
        SELECT s.id, 'appointment_booked', 'New appointment', v_body, NEW.created_by,
               '/dashboard/appointments'
        FROM crm.staff s
        WHERE s.id = NEW.assigned_staff_id
          AND s.deleted_at IS NULL AND s.is_active = TRUE
          AND s.id IS DISTINCT FROM NEW.created_by;
    ELSE
        INSERT INTO crm.notifications (staff_id, type, title, body, actor_id, link)
        SELECT w.staff_id, 'appointment_booked', 'New appointment', v_body, NEW.created_by,
               '/dashboard/appointments'
        FROM crm.staff_ids_with_permission('manage_appointments') AS w(staff_id)
        WHERE w.staff_id IS DISTINCT FROM NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_booked
    AFTER INSERT ON crm.appointments
    FOR EACH ROW
    EXECUTE FUNCTION crm.notify_appointment_booked();

-- ---------------------------------------------------------------------------
-- New lead: notify the assigned RCIC if set, otherwise every staff member who
-- can create clients. The creator (created_by) is never notified. Only fires
-- for rows that start as a lead.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm.notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_link TEXT;
BEGIN
    IF NEW.status <> 'lead' THEN
        RETURN NEW;
    END IF;

    v_link := '/dashboard/clients/' || NEW.id;

    IF NEW.assigned_rcic IS NOT NULL THEN
        INSERT INTO crm.notifications (staff_id, type, title, body, actor_id, link)
        SELECT s.id, 'new_lead', 'New lead', NEW.legal_name_full, NEW.created_by, v_link
        FROM crm.staff s
        WHERE s.id = NEW.assigned_rcic
          AND s.deleted_at IS NULL AND s.is_active = TRUE
          AND s.id IS DISTINCT FROM NEW.created_by;
    ELSE
        INSERT INTO crm.notifications (staff_id, type, title, body, actor_id, link)
        SELECT w.staff_id, 'new_lead', 'New lead', NEW.legal_name_full, NEW.created_by, v_link
        FROM crm.staff_ids_with_permission('create_clients') AS w(staff_id)
        WHERE w.staff_id IS DISTINCT FROM NEW.created_by;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_lead
    AFTER INSERT ON crm.clients
    FOR EACH ROW
    EXECUTE FUNCTION crm.notify_new_lead();

-- ---------------------------------------------------------------------------
-- Realtime: publish the table so the bell can subscribe to INSERTs. RLS still
-- applies per subscriber (notifications_select_own), so each staff member only
-- receives their own rows.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime'
             AND schemaname = 'crm'
             AND tablename = 'notifications'
       )
    THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE crm.notifications;
    END IF;
END
$$;
