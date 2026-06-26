// Build the four KPI view models: current values live (always fresh), with the
// previous value and the sparkline series from the nightly snapshot table.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import { computeFirmMetrics } from "./firm-metrics";
import { KPI_METRICS } from "./metrics";
import type { KpiKey, KpiView } from "./types";

type SnapshotRow = {
  snapshot_date: string;
  active_cases: number;
  total_clients: number;
  retained_mtd: number;
  outstanding_fees_cad: number | null;
};

type Accessor = (r: SnapshotRow) => number | null;

const ACCESSORS: Record<KpiKey, Accessor> = {
  active_cases: (r) => r.active_cases,
  clients: (r) => r.total_clients,
  retained_mtd: (r) => r.retained_mtd,
  outstanding_fees: (r) => r.outstanding_fees_cad,
};

const SERIES_POINTS = 8;

function rowDate(r: SnapshotRow): number {
  return new Date(`${r.snapshot_date}T00:00:00`).getTime();
}

// The value about `daysAgo` days back, used as the vs-last-month baseline.
// Picks the non-null snapshot closest to that target date, or null if none.
function valueAround(
  history: SnapshotRow[],
  accessor: Accessor,
  daysAgo: number,
): number | null {
  const target = Date.now() - daysAgo * 86_400_000;
  let best: { diff: number; value: number } | null = null;
  for (const r of history) {
    const value = accessor(r);
    if (value === null) continue;
    const diff = Math.abs(rowDate(r) - target);
    if (!best || diff < best.diff) best = { diff, value };
  }
  return best ? best.value : null;
}

// Up to 8 evenly sampled non-null history points, with the live current value
// appended as the newest point so the sparkline always ends on "now".
function buildSeries(
  history: SnapshotRow[],
  accessor: Accessor,
  current: number,
): number[] {
  const values = history
    .map(accessor)
    .filter((v): v is number => v !== null);

  let sampled = values;
  if (values.length > SERIES_POINTS) {
    sampled = [];
    const step = (values.length - 1) / (SERIES_POINTS - 1);
    for (let i = 0; i < SERIES_POINTS; i++) {
      sampled.push(values[Math.round(i * step)]);
    }
  }
  return [...sampled, current];
}

export async function getKpis(
  supabase: SupabaseClient<Database>,
): Promise<KpiView[]> {
  const current = await computeFirmMetrics(supabase);

  // Tolerate the snapshot table being empty or unavailable (for example before
  // the migration runs on a given database): current values still render, the
  // trend just degrades to flat.
  const { data } = await supabase
    .schema("crm")
    .from("firm_metric_daily")
    .select(
      "snapshot_date, active_cases, total_clients, retained_mtd, outstanding_fees_cad",
    )
    .order("snapshot_date", { ascending: true });
  const history = (data ?? []) as SnapshotRow[];

  const currentByKey: Record<KpiKey, number> = {
    active_cases: current.activeCases,
    clients: current.totalClients,
    retained_mtd: current.retainedMtd,
    outstanding_fees: current.outstandingFeesCad,
  };

  return KPI_METRICS.map((m): KpiView => {
    const accessor = ACCESSORS[m.key];
    const cur = currentByKey[m.key];
    return {
      key: m.key,
      label: m.label,
      unit: m.unit,
      higherIsBetter: m.higherIsBetter,
      format: m.format,
      hint: m.hint,
      current: cur,
      previous: valueAround(history, accessor, 30),
      series: buildSeries(history, accessor, cur),
    };
  });
}
