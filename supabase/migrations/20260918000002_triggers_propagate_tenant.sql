-- ============================================================================
-- Triggers must carry the tenant onto the rows they create.
-- ============================================================================
--
-- Several triggers insert derived rows: a case gets a draft retainer, an
-- assigned task notifies its owner, a case event fans out notifications.
-- None of them set tenant_id. They were relying on the column default,
-- crm.current_tenant_id(), which reads the caller's session.
--
-- That holds for a staff member clicking through the app, and fails
-- everywhere else: the service-role paths (public booking, the client upload
-- and payment portals, the signing flow, the cron sweeps) have no session, so
-- the default resolves to NULL and the insert dies on NOT NULL — taking the
-- parent operation down with it, since these are BEFORE/AFTER triggers in the
-- same transaction.
--
-- The fix is not a better default. A derived row belongs to the same firm as
-- the row that caused it, and NEW already carries that, so propagate it
-- explicitly and stop depending on who happens to be executing.

CREATE OR REPLACE FUNCTION crm.ensure_retainer_for_new_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    INSERT INTO crm.retainer_agreements (tenant_id, case_id, status, created_by)
    VALUES (
        NEW.tenant_id,
        NEW.id,
        'draft'::crm.retainer_agreement_status,
        NEW.created_by
    )
    ON CONFLICT (case_id) DO NOTHING;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.notify_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF NEW.assigned_to IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
        RETURN NEW;
    END IF;

    -- Don't notify someone for assigning a task to themselves.
    IF NEW.assigned_to IS NOT DISTINCT FROM NEW.created_by THEN
        RETURN NEW;
    END IF;

    INSERT INTO crm.notifications (tenant_id, staff_id, type, title, body, case_id, actor_id)
    SELECT NEW.tenant_id, NEW.assigned_to, 'task_assigned',
           'Task assigned to you', NEW.title, NEW.case_id, NEW.created_by
    FROM crm.staff s
    WHERE s.id = NEW.assigned_to
      AND s.deleted_at IS NULL
      AND s.is_active = TRUE
      -- Belt and braces: never notify across firms even if a bad assignment
      -- slipped through.
      AND s.tenant_id = NEW.tenant_id;

    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- The notification triggers
-- ---------------------------------------------------------------------------
--
-- Same propagation, plus a second problem they share: they fan out through
-- crm.staff_ids_with_permission, which filters on crm.current_tenant_id().
-- Under the service role that is NULL, so a lead captured from the public
-- contact form or a publicly booked appointment notified nobody at all —
-- silently, because returning no rows is not an error.
--
-- The helper now takes an explicit tenant, defaulting to the session's when
-- omitted, so existing staff-side callers are unchanged.

-- Drop the single-argument version first. Adding a defaulted parameter with
-- CREATE OR REPLACE makes an OVERLOAD, not a replacement, and every existing
-- one-argument call then fails with 'function is not unique' — the same trap
-- that took out the number generators in 20260914000001.
DROP FUNCTION IF EXISTS crm.staff_ids_with_permission(TEXT);

CREATE OR REPLACE FUNCTION crm.staff_ids_with_permission(
    p_permission TEXT,
    p_tenant UUID DEFAULT NULL
)
RETURNS TABLE (staff_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
    SELECT s.id
      FROM crm.staff s
     WHERE s.deleted_at IS NULL
       AND s.is_active = TRUE
       AND s.tenant_id = COALESCE(p_tenant, crm.current_tenant_id())
       AND crm.staff_can(s.auth_user_id, p_permission);
$function$;

CREATE OR REPLACE FUNCTION crm.fanout_case_event_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
        tenant_id, staff_id, type, title, body, case_id, source_event_id, actor_id, link
    )
    SELECT DISTINCT
        NEW.tenant_id, ca.staff_id, v_type, v_title, NEW.description, NEW.case_id, NEW.id, NEW.created_by,
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
$function$;

CREATE OR REPLACE FUNCTION crm.notify_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_link TEXT;
BEGIN
    IF NEW.status <> 'lead' THEN
        RETURN NEW;
    END IF;

    v_link := '/dashboard/clients/' || NEW.id;

    IF NEW.assigned_rcic IS NOT NULL THEN
        INSERT INTO crm.notifications (tenant_id, staff_id, type, title, body, actor_id, link)
        SELECT NEW.tenant_id, s.id, 'new_lead', 'New lead', NEW.legal_name_full, NEW.created_by, v_link
        FROM crm.staff s
        WHERE s.id = NEW.assigned_rcic
          AND s.deleted_at IS NULL AND s.is_active = TRUE
          AND s.id IS DISTINCT FROM NEW.created_by;
    ELSE
        INSERT INTO crm.notifications (tenant_id, staff_id, type, title, body, actor_id, link)
        SELECT NEW.tenant_id, w.staff_id, 'new_lead', 'New lead', NEW.legal_name_full, NEW.created_by, v_link
        FROM crm.staff_ids_with_permission('create_clients', NEW.tenant_id) AS w(staff_id)
        WHERE w.staff_id IS DISTINCT FROM NEW.created_by;
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION crm.notify_appointment_booked()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_body TEXT;
BEGIN
    v_body := NEW.snapshot_client_name || ' — ' ||
        to_char(
            NEW.starts_at AT TIME ZONE COALESCE(NEW.timezone, 'America/Toronto'),
            'FMMon FMDD, HH24:MI'
        );

    IF NEW.assigned_staff_id IS NOT NULL THEN
        INSERT INTO crm.notifications (tenant_id, staff_id, type, title, body, actor_id, link)
        SELECT NEW.tenant_id, s.id, 'appointment_booked', 'New appointment', v_body, NEW.created_by,
               '/dashboard/appointments'
        FROM crm.staff s
        WHERE s.id = NEW.assigned_staff_id
          AND s.deleted_at IS NULL AND s.is_active = TRUE
          AND s.id IS DISTINCT FROM NEW.created_by;
    ELSE
        INSERT INTO crm.notifications (tenant_id, staff_id, type, title, body, actor_id, link)
        SELECT NEW.tenant_id, w.staff_id, 'appointment_booked', 'New appointment', v_body, NEW.created_by,
               '/dashboard/appointments'
        FROM crm.staff_ids_with_permission('manage_appointments', NEW.tenant_id) AS w(staff_id)
        WHERE w.staff_id IS DISTINCT FROM NEW.created_by;
    END IF;

    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- The signup-funnel notification is retired
-- ---------------------------------------------------------------------------
--
-- crm.software_access_requests holds firms asking to buy the platform. It is
-- the operator's pipeline, not any tenant's data, yet this trigger dropped a
-- notification on every staff member at every firm holding view_clients —
-- announcing each rival firm's name and contact to all of them.
--
-- The operator now has a queue for these at /admin/access-requests, so the
-- fan-out has no remaining purpose. Dropping the trigger rather than
-- tenant-scoping it: there is no tenant to scope it to.

DROP TRIGGER IF EXISTS trg_notify_software_access_request
    ON crm.software_access_requests;
DROP FUNCTION IF EXISTS crm.notify_software_access_request();
