-- ============================================================================
-- Firm dashboard: nightly metric snapshots
--
-- The dashboard KPIs (active cases, clients, retained this month, outstanding
-- fees) gain a sparkline and a vs-last-month delta. Those need a time series,
-- not just a current number, so we keep one row per day in analytics.
--
-- The nightly cron (/api/cron/daily) appends today's row going forward. This
-- migration also backfills about 60 days of COUNT history from existing row
-- timestamps so the sparklines and deltas work on day one. Outstanding fees
-- cannot be reconstructed historically (it depends on payment timing and the
-- retainer state at each past instant), so it is left NULL for backfilled rows
-- and builds forward from the cron.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;
GRANT USAGE ON SCHEMA analytics TO authenticated, service_role;

CREATE TABLE analytics.firm_metric_daily (
    snapshot_date        DATE PRIMARY KEY,
    active_cases         INT NOT NULL DEFAULT 0,
    total_clients        INT NOT NULL DEFAULT 0,
    retained_mtd         INT NOT NULL DEFAULT 0,
    outstanding_fees_cad NUMERIC(12, 2),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON analytics.firm_metric_daily TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics.firm_metric_daily TO service_role;

ALTER TABLE analytics.firm_metric_daily ENABLE ROW LEVEL SECURITY;

-- Any staff who can see the dashboard can read the firm metric history. Writes
-- happen only through the service-role cron, which bypasses RLS.
CREATE POLICY firm_metric_daily_select ON analytics.firm_metric_daily
    FOR SELECT
    USING (crm.staff_can(auth.uid(), 'view_dashboard'));

-- ---------------------------------------------------------------------------
-- Backfill ~60 daily rows of count history. Counts are derived from row
-- timestamps so they are exact:
--   active_cases  : opened on or before D and not yet closed by D
--   total_clients : created on or before D
--   retained_mtd  : retained between the first of D's month and D
-- outstanding_fees_cad is intentionally left NULL for these rows (see header).
-- ---------------------------------------------------------------------------

INSERT INTO analytics.firm_metric_daily
    (snapshot_date, active_cases, total_clients, retained_mtd)
SELECT
    (current_date - s.n) AS snapshot_date,
    (
        SELECT count(*)
        FROM crm.cases c
        WHERE c.deleted_at IS NULL
          AND c.opened_at::date <= (current_date - s.n)
          AND (c.closed_at IS NULL OR c.closed_at::date > (current_date - s.n))
    ),
    (
        SELECT count(*)
        FROM crm.clients cl
        WHERE cl.deleted_at IS NULL
          AND cl.created_at::date <= (current_date - s.n)
    ),
    (
        SELECT count(*)
        FROM crm.cases c
        WHERE c.deleted_at IS NULL
          AND c.retained_at IS NOT NULL
          AND c.retained_at::date >= date_trunc('month', (current_date - s.n))::date
          AND c.retained_at::date <= (current_date - s.n)
    )
FROM generate_series(0, 59) AS s(n)
ON CONFLICT (snapshot_date) DO NOTHING;
