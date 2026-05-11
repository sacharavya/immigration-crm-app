-- =========================================================================
-- Open audit.change_log to read by view_audit_log holders.
--
-- Today the audit table has SECURITY DEFINER trigger writes that
-- bypass GRANTs, so logging works for every staff role. But reads
-- from the cookie-based client (`authenticated` role) get a
-- permission-denied because the schema/table aren't granted to that
-- role. This migration:
--
--   1. Grants USAGE on schema audit + SELECT on change_log to
--      authenticated, so PostgREST queries can even reach the table.
--   2. Enables RLS + a policy gating reads on
--      crm.staff_can(auth.uid(), 'view_audit_log'), which today is
--      effectively super_user-only (no other role has the permission
--      in TS or in the SQL CASE branches).
--
-- INSERT/UPDATE/DELETE still go through the SECURITY DEFINER trigger;
-- no policies for those because the app never writes directly.
-- =========================================================================

GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON audit.change_log TO authenticated;

ALTER TABLE audit.change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY change_log_read ON audit.change_log
  FOR SELECT
  USING (crm.staff_can(auth.uid(), 'view_audit_log'));

CREATE POLICY change_log_service_role ON audit.change_log
  FOR ALL TO service_role USING (true);
