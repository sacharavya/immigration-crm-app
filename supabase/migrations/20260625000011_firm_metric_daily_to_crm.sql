-- ============================================================================
-- Move the firm metric snapshot into the crm schema.
--
-- 20260625000009 created analytics.firm_metric_daily, but the analytics schema
-- is not in the PostgREST exposed-schemas list, so the dashboard's supabase-js
-- reads (.schema("analytics")) and the nightly cron's writes would 404. crm is
-- already exposed and granted, so relocating the table is the least-risk fix.
-- The table's RLS policy and grants travel with it under ALTER TABLE SET SCHEMA.
-- ============================================================================

ALTER TABLE analytics.firm_metric_daily SET SCHEMA crm;

-- The analytics schema is now empty; remove it (and its schema-level grants).
DROP SCHEMA IF EXISTS analytics;
