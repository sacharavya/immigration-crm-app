import { adminClient } from "@/lib/supabase/admin";
import { computeFirmMetrics } from "@/lib/dashboard/firm-metrics";

// Nightly firm-metric snapshot. Writes (or refreshes) today's row in
// analytics.firm_metric_daily so the dashboard KPIs have a time series for
// their sparklines and a vs-last-month baseline. The counts are also
// backfilled at migration time; this sweep is what fills outstanding fees
// going forward (it cannot be reconstructed historically).

const FIRM_TZ = "America/Toronto";

export type FirmMetricsSnapshotResult = {
  snapshot_date: string;
  active_cases: number;
  total_clients: number;
  retained_mtd: number;
  outstanding_fees_cad: number;
};

export async function runFirmMetricsSnapshotSweep(): Promise<FirmMetricsSnapshotResult> {
  const supabase = adminClient();

  const metrics = await computeFirmMetrics(supabase);

  // Stamp the row with today's date in the firm's timezone, so a run just
  // after UTC midnight still lands on the local day.
  const snapshotDate = new Date().toLocaleDateString("en-CA", {
    timeZone: FIRM_TZ,
  }); // YYYY-MM-DD

  const row = {
    snapshot_date: snapshotDate,
    active_cases: metrics.activeCases,
    total_clients: metrics.totalClients,
    retained_mtd: metrics.retainedMtd,
    outstanding_fees_cad: metrics.outstandingFeesCad,
  };

  const { error } = await supabase
    .schema("crm")
    .from("firm_metric_daily")
    .upsert(row, { onConflict: "snapshot_date" });

  if (error) {
    throw new Error(`firm-metrics snapshot upsert failed: ${error.message}`);
  }

  return row;
}
