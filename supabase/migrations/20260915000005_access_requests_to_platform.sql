-- ============================================================================
-- Alpha access requests belong to the platform operator, not to tenant firms.
-- ============================================================================
--
-- crm.software_access_requests is the platform's own B2B signup funnel: firms
-- asking to be onboarded onto the product. The multitenancy migration already
-- left it deliberately global (no tenant_id), but its RLS still dated from
-- before the platform layer existed and granted read to any authenticated
-- staff member holding 'view_clients' -- in ANY tenant.
--
-- That meant every onboarded firm could read the contact details, firm size
-- and current software of every other firm in the signup pipeline, including
-- direct competitors. Same for the bell notification, which fanned out to all
-- tenant staff with that permission.
--
-- This migration moves both the read path and the alert to the operator.
-- The table stays in `crm` (moving it would rewrite the insert path for no
-- security gain); RLS is what decides, and RLS now says platform admins only.

-- ---------------------------------------------------------------------------
-- 1. Reads and triage: platform admins only
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS software_requests_select ON crm.software_access_requests;
DROP POLICY IF EXISTS software_requests_update ON crm.software_access_requests;

CREATE POLICY software_requests_admin_reads
    ON crm.software_access_requests FOR SELECT TO authenticated
    USING (platform.is_admin());

CREATE POLICY software_requests_admin_triages
    ON crm.software_access_requests FOR UPDATE TO authenticated
    USING (platform.is_admin())
    WITH CHECK (platform.is_admin());

COMMENT ON TABLE crm.software_access_requests IS
    'Platform-level B2B signup funnel. No tenant_id by design, and readable '
    'only by platform admins -- tenant staff must never see other firms in '
    'the pipeline.';

-- ---------------------------------------------------------------------------
-- 2. Stop notifying tenant staff
-- ---------------------------------------------------------------------------
--
-- crm.notifications is keyed on crm.staff, and a platform admin has no staff
-- row by design, so there is nothing to re-point the trigger at. The operator
-- sees new requests in the portal, which shows a pending count. Dropped
-- rather than left firing at the wrong audience.

DROP TRIGGER IF EXISTS trg_notify_software_access_request
    ON crm.software_access_requests;
DROP FUNCTION IF EXISTS crm.notify_software_access_request();

-- Clear the ones already delivered to tenant staff: they link to
-- /dashboard/leads, which no longer renders this table.
DELETE FROM crm.notifications
 WHERE type = 'new_lead'
   AND title = 'BBI-CRM access request';
