// The four firm KPI current values, computed server side from live data.
// Shared by getKpis (the dashboard) and the nightly snapshot cron so the
// dashboard and the stored history can never diverge.

import type { SupabaseClient } from "@supabase/supabase-js";

import { computeCaseOutstanding } from "@/lib/cases/fee-totals";
import { isPaymentVerified } from "@/lib/payments/verified";
import type { Database } from "@/lib/supabase/types";

export type FirmMetrics = {
  activeCases: number;
  totalClients: number;
  retainedMtd: number;
  outstandingFeesCad: number;
};

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function computeFirmMetrics(
  supabase: SupabaseClient<Database>,
): Promise<FirmMetrics> {
  const monthStart = startOfMonthISO();

  const [casesRes, clientCountRes, paymentsRes] = await Promise.all([
    supabase
      .schema("crm")
      .from("cases")
      .select("id, retained_at, quoted_fee_cad, government_fee_cad")
      .is("deleted_at", null)
      .neq("status", "closed"),
    supabase
      .schema("crm")
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select("case_id, amount_cad, is_refund, client_uploaded_at, verified_at")
      .is("deleted_at", null),
  ]);

  const cases = casesRes.data ?? [];
  const totalClients =
    "count" in clientCountRes ? (clientCountRes.count ?? 0) : 0;
  const payments = paymentsRes.data ?? [];

  // Signed-retainer snapshot per case so the outstanding total includes the
  // government fee and HST, not just the service fee.
  const retainersByCase = new Map<
    string,
    { government_fee_cad: number | null; hst_cad: number | null }
  >();
  if (cases.length > 0) {
    const { data: retainers } = await supabase
      .schema("crm")
      .from("retainer_agreements")
      .select("case_id, government_fee_cad, hst_cad, signed_at, voided_at")
      .in(
        "case_id",
        cases.map((c) => c.id),
      )
      .is("deleted_at", null)
      .not("signed_at", "is", null);
    for (const r of retainers ?? []) {
      if (r.case_id && r.signed_at && !r.voided_at) {
        retainersByCase.set(r.case_id, {
          government_fee_cad: r.government_fee_cad,
          hst_cad: r.hst_cad,
        });
      }
    }
  }

  // Only verified payments reduce the outstanding total.
  const collectedByCase = new Map<string, number>();
  for (const p of payments) {
    if (!p.case_id || !isPaymentVerified(p)) continue;
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id,
      (collectedByCase.get(p.case_id) ?? 0) + sign * Number(p.amount_cad),
    );
  }

  let outstandingFeesCad = 0;
  let retainedMtd = 0;
  for (const c of cases) {
    outstandingFeesCad += computeCaseOutstanding(
      c,
      retainersByCase.get(c.id) ?? null,
      collectedByCase.get(c.id) ?? 0,
    );
    if (c.retained_at && c.retained_at >= monthStart) retainedMtd += 1;
  }

  return {
    activeCases: cases.length,
    totalClients,
    retainedMtd,
    outstandingFeesCad: Math.round(outstandingFeesCad * 100) / 100,
  };
}
