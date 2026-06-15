-- Hot-fix: PostgREST's in-process schema cache was missing the
-- crm.payments.client_uploaded_at column that migration
-- 20260608000001 added, so /pay/<token> portal uploads failed with
-- "Could not find the 'client_uploaded_at' column of 'payments' in
-- the schema cache".
--
-- PostgREST refreshes its cache on receipt of this NOTIFY (or on
-- restart). The DDL change itself usually triggers an automatic
-- reload, but if the migration ran during a maintenance window or
-- the instance was sleeping, the cache can lag — this NOTIFY makes
-- the reload deterministic.
--
-- Safe to ship as a regular migration: NOTIFY is idempotent and
-- carries no schema change.

NOTIFY pgrst, 'reload schema';
