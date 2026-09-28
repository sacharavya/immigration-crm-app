import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type SnapshotPoint = { date: string; active: number; clients: number };

/** The nightly firm snapshot for the last `days`, oldest first, for charting. */
export async function getSnapshotSeries(
  supabase: SupabaseClient<Database>,
  days = 90,
): Promise<SnapshotPoint[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .schema("crm")
    .from("firm_metric_daily")
    .select("snapshot_date, active_cases, total_clients")
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });
  return (data ?? []).map((r) => ({ date: r.snapshot_date, active: r.active_cases, clients: r.total_clients }));
}
