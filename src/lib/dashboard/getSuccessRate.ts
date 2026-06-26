// Approval success rate per service and per category, over the trailing 12
// months by decision date. Outcome is derived from case status (no outcome
// enum): approved = passport_requested, refused = refused. A sample-size floor
// keeps a 2-case category from reading as a real 0% or 100%.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { RadarAxis, RadarData } from "./types";

// Below this many decided cases an axis is treated as no signal (successRate
// null): plotted dimmed and labelled with a count, excluded from the summary.
export const MIN_DECIDED = 5;

type Bucket = { key: string; label: string; decided: number; approved: number };

function toAxis(b: Bucket): RadarAxis {
  return {
    key: b.key,
    label: b.label,
    decidedCount: b.decided,
    approvedCount: b.approved,
    successRate: b.decided >= MIN_DECIDED ? b.approved / b.decided : null,
  };
}

export async function getSuccessRate(
  supabase: SupabaseClient<Database>,
): Promise<RadarData> {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const { data: decided } = await supabase
    .schema("crm")
    .from("cases")
    .select("service_type_id, status, decided_at")
    .is("deleted_at", null)
    .in("status", ["passport_requested", "refused"])
    .gte("decided_at", since.toISOString());

  const rows = decided ?? [];
  if (rows.length === 0) return { service: [], category: [] };

  const serviceTypeIds = [...new Set(rows.map((r) => r.service_type_id))];
  const [{ data: serviceTypes }, { data: categories }] = await Promise.all([
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, code, category_code")
      .in("id", serviceTypeIds),
    supabase.schema("ref").from("service_categories").select("code, name"),
  ]);

  const categoryNameByCode = new Map(
    (categories ?? []).map((c) => [c.code, c.name]),
  );
  const serviceById = new Map(
    (serviceTypes ?? []).map((s) => [
      s.id,
      { code: s.code, categoryCode: s.category_code },
    ]),
  );

  const serviceBuckets = new Map<string, Bucket>();
  const categoryBuckets = new Map<string, Bucket>();

  for (const r of rows) {
    const svc = serviceById.get(r.service_type_id);
    if (!svc) continue;
    const approved = r.status === "passport_requested" ? 1 : 0;

    const sb =
      serviceBuckets.get(r.service_type_id) ??
      serviceBuckets
        .set(r.service_type_id, {
          key: svc.code,
          label: svc.code,
          decided: 0,
          approved: 0,
        })
        .get(r.service_type_id)!;
    sb.decided += 1;
    sb.approved += approved;

    const cb =
      categoryBuckets.get(svc.categoryCode) ??
      categoryBuckets
        .set(svc.categoryCode, {
          key: svc.categoryCode,
          label: categoryNameByCode.get(svc.categoryCode) ?? svc.categoryCode,
          decided: 0,
          approved: 0,
        })
        .get(svc.categoryCode)!;
    cb.decided += 1;
    cb.approved += approved;
  }

  return {
    service: [...serviceBuckets.values()].map(toAxis),
    category: [...categoryBuckets.values()].map(toAxis),
  };
}
