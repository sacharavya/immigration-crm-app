-- B2B alpha program: firms requesting access to BBI-CRM through the public
-- /crm page. Inserts come only from the server action (service role); staff
-- who can see leads can read them.

CREATE TABLE crm.software_access_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name        TEXT NOT NULL,
    contact_name     TEXT NOT NULL,
    email            CITEXT NOT NULL,
    phone            TEXT,
    rcic_number      TEXT,
    firm_size        TEXT,
    current_software TEXT,
    message          TEXT,
    status           TEXT NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'onboarding', 'active', 'declined')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_software_access_requests_created
    ON crm.software_access_requests (created_at DESC);

GRANT SELECT, UPDATE ON crm.software_access_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.software_access_requests TO service_role;

ALTER TABLE crm.software_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY software_requests_select ON crm.software_access_requests
    FOR SELECT USING (crm.staff_can(auth.uid(), 'view_clients'));

CREATE POLICY software_requests_update ON crm.software_access_requests
    FOR UPDATE USING (crm.staff_can(auth.uid(), 'edit_clients'))
    WITH CHECK (crm.staff_can(auth.uid(), 'edit_clients'));

-- Bell notification to everyone who can see leads, mirroring the new-lead
-- trigger. Reuses the 'new_lead' notification type; the title distinguishes.
CREATE OR REPLACE FUNCTION crm.notify_software_access_request()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO crm.notifications (staff_id, type, title, body, link)
    SELECT w.staff_id, 'new_lead', 'BBI-CRM access request',
           NEW.firm_name || ' — ' || NEW.contact_name || ' (' || NEW.email || ')',
           '/dashboard/leads'
    FROM crm.staff_ids_with_permission('view_clients') AS w(staff_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_software_access_request
    AFTER INSERT ON crm.software_access_requests
    FOR EACH ROW EXECUTE FUNCTION crm.notify_software_access_request();
