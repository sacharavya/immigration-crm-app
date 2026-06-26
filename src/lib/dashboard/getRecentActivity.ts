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
      "id, case_number, status, updated_at, client:clients(legal_name_full)",
    )
    .is("deleted_at", null)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((c) => ({
    caseId: c.id,
    caseNumber: c.case_number,
    clientName: c.client?.legal_name_full ?? "Unknown client",
    status: c.status,
    updatedAt: c.updated_at,
  }));
}
