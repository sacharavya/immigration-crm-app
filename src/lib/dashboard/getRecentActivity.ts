// Most recent activity across active cases.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { RecentRow } from "./types";

export async function getRecentActivity(
  supabase: SupabaseClient<Database>,
  limit = 6,
): Promise<RecentRow[]> {
  const { data } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, case_number, status, service_type_id, updated_at, client:clients(legal_name_full)",
    )
    .is("deleted_at", null)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];

  // service_types lives in ref, so no cross-schema embed; separate lookup.
  const serviceTypeIds = [
    ...new Set(rows.map((c) => c.service_type_id).filter(Boolean)),
  ];
  const { data: serviceTypes } = serviceTypeIds.length
    ? await supabase
        .schema("ref")
        .from("service_types")
        .select("id, name")
        .in("id", serviceTypeIds)
    : { data: [] };
  const nameById = new Map((serviceTypes ?? []).map((s) => [s.id, s.name]));

  return rows.map((c) => ({
    caseId: c.id,
    caseNumber: c.case_number,
    clientName: c.client?.legal_name_full ?? "Unknown client",
    serviceName: nameById.get(c.service_type_id) ?? null,
    status: c.status,
    updatedAt: c.updated_at,
  }));
}
