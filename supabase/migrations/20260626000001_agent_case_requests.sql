-- ============================================================================
-- Referral agents: case requests + read-only case status
--
-- Agents cannot create cases: a case needs an RCIC of record (a licensed staff
-- member), a fee, and a case worker, and it auto-generates a retainer. Instead
-- an agent files a REQUEST for one of their own clients; staff see it in a queue
-- and open the real case through the normal new-case wizard.
--
-- This also exposes the client's cases to the agent as STATUS ONLY (no fees, no
-- internal notes) via a view, so agents never get a SELECT policy on crm.cases.
--
-- Reuses the agent identity helper crm.current_agent_id() and the scrub-trigger
-- pattern from 20260625000010_referral_agents.sql. No new permission: staff read
-- the queue with view_cases and act on it with create_cases.
-- ============================================================================

CREATE TYPE crm.case_request_status AS ENUM ('pending', 'opened', 'dismissed');

CREATE TABLE crm.case_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         UUID NOT NULL REFERENCES crm.clients(id) ON DELETE CASCADE,
    service_type_id   UUID REFERENCES ref.service_types(id),
    agent_id          UUID NOT NULL REFERENCES crm.referral_agents(id),
    note              TEXT,
    status            crm.case_request_status NOT NULL DEFAULT 'pending',
    resulting_case_id UUID REFERENCES crm.cases(id),
    handled_by        UUID REFERENCES crm.staff(id),
    handled_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_requests_pending
    ON crm.case_requests (created_at) WHERE status = 'pending';
CREATE INDEX idx_case_requests_agent  ON crm.case_requests (agent_id);
CREATE INDEX idx_case_requests_client ON crm.case_requests (client_id);

-- The schema-wide grant in 20260501000002 only covered tables that existed then.
GRANT SELECT, INSERT, UPDATE         ON crm.case_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crm.case_requests TO service_role;

-- ---------------------------------------------------------------------------
-- Defense in depth: force agent attribution + a clean pending state on an
-- agent's insert, mirroring crm.scrub_agent_client_insert().
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crm.scrub_agent_case_request() RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_agent UUID := crm.current_agent_id();
BEGIN
    IF v_agent IS NOT NULL THEN
        NEW.agent_id          := v_agent;     -- force self-attribution
        NEW.status            := 'pending';
        NEW.resulting_case_id := NULL;
        NEW.handled_by        := NULL;
        NEW.handled_at        := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scrub_agent_case_request ON crm.case_requests;
CREATE TRIGGER trg_scrub_agent_case_request
    BEFORE INSERT ON crm.case_requests
    FOR EACH ROW EXECUTE FUNCTION crm.scrub_agent_case_request();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE crm.case_requests ENABLE ROW LEVEL SECURITY;

-- An agent may file a request only for one of its own clients, attributed to
-- itself.
CREATE POLICY case_requests_agent_insert ON crm.case_requests
    FOR INSERT
    WITH CHECK (
        crm.current_agent_id() IS NOT NULL
        AND agent_id = crm.current_agent_id()
        AND client_id IN (
            SELECT id FROM crm.clients
            WHERE created_by_agent = crm.current_agent_id()
        )
    );

-- An agent may read only its own requests (to see pending / opened state).
CREATE POLICY case_requests_agent_select ON crm.case_requests
    FOR SELECT
    USING (agent_id = crm.current_agent_id());

-- Staff who can see cases can read the queue.
CREATE POLICY case_requests_staff_select ON crm.case_requests
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_cases'));

-- Staff who can create cases can open or dismiss a request.
CREATE POLICY case_requests_staff_update ON crm.case_requests
    FOR UPDATE
    USING (crm.staff_can(auth.uid(), 'create_cases'))
    WITH CHECK (crm.staff_can(auth.uid(), 'create_cases'));

-- ---------------------------------------------------------------------------
-- crm.agent_case_status: the client's cases as STATUS ONLY, for the calling
-- agent's own clients. A normal (non security_invoker) view runs as its owner
-- and bypasses base-table RLS, returning only these columns and only the rows
-- its WHERE allows, so agents get no SELECT policy on crm.cases and cannot see
-- fees or internal notes. current_agent_id() reads the caller's JWT, so the
-- filter is per-agent even though the view runs as owner.
-- ---------------------------------------------------------------------------

CREATE VIEW crm.agent_case_status AS
    SELECT c.id,
           c.case_number,
           c.client_id,
           c.service_type_id,
           st.name AS service_name,
           c.status,
           c.created_at
      FROM crm.cases c
      LEFT JOIN ref.service_types st ON st.id = c.service_type_id
     WHERE c.deleted_at IS NULL
       AND c.client_id IN (
           SELECT id FROM crm.clients
           WHERE created_by_agent = crm.current_agent_id()
       );

GRANT SELECT ON crm.agent_case_status TO authenticated;
