// Load the same derived board-card model the cases board/list use, for every
// active case, so the dashboard's Needs attention list and Pipeline "on us"
// counts agree with the board exactly. The expensive cross-schema assembly
// lives here once; getNeedsAttention and getPipeline are pure transforms over
// the result.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  chipInputFromViewRow,
  computeActionChip,
} from "@/lib/cases/action-chip";
import { deriveBoardCard, type BoardCardModel } from "@/lib/cases/board-card";
import { computeCaseFeeBreakdown } from "@/lib/cases/fee-totals";
import { deriveSubmissionRisk } from "@/lib/cases/submission-risk";
import { isPaymentVerified } from "@/lib/payments/verified";
import type { Database } from "@/lib/supabase/types";
import type { ImmigrationStatusType } from "@/lib/validators/client-immigration";

export type EnrichedCard = {
  card: BoardCardModel;
  outstandingCad: number;
  retainerSigned: boolean;
  // Required docs whose latest file is uploaded but not yet accepted: the
  // firm's new-uploads-to-review queue (not exposed on BoardCardModel).
  awaitingReview: number;
  // Whole days until the client's permit expiry (negative when overdue), or
  // null when the case is not at risk.
  daysUntilExpiry: number | null;
};

export async function loadActiveBoardCards(
  supabase: SupabaseClient<Database>,
): Promise<EnrichedCard[]> {
  const { data: cases } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        client_id,
        status,
        updated_at,
        submitted_at,
        priority,
        quoted_fee_cad,
        government_fee_cad,
        retainer_minimum_cad,
        service_type_id,
        assigned_paralegal,
        client:clients(legal_name_full)
      `,
    )
    .is("deleted_at", null)
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(300);

  const rows = cases ?? [];
  if (rows.length === 0) return [];

  const caseIds = rows.map((c) => c.id);
  const clientIds = [...new Set(rows.map((c) => c.client_id))];
  const serviceTypeIds = [...new Set(rows.map((c) => c.service_type_id))];

  const [
    { data: payments },
    { data: retainers },
    { data: serviceTypes },
    { data: staff },
    { data: chipRows },
    { data: clientsImmigration },
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("payments")
      .select("case_id, amount_cad, is_refund, client_uploaded_at, verified_at")
      .in("case_id", caseIds)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("retainer_agreements")
      .select("case_id, government_fee_cad, hst_cad, signed_at, voided_at")
      .in("case_id", caseIds)
      .is("deleted_at", null),
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, name")
      .in("id", serviceTypeIds),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name")
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("v_case_chip_inputs")
      .select("*")
      .in("case_id", caseIds),
    supabase.schema("crm").from("clients").select("*").in("id", clientIds),
  ]);

  const serviceNameById = new Map(
    (serviceTypes ?? []).map((s) => [s.id, s.name]),
  );
  const staffNameById = new Map(
    (staff ?? []).map((a) => [a.id, `${a.first_name} ${a.last_name}`.trim()]),
  );

  const collectedByCase = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.case_id || !isPaymentVerified(p)) continue;
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id,
      (collectedByCase.get(p.case_id) ?? 0) + sign * Number(p.amount_cad),
    );
  }

  const signedRetainerByCase = new Map<
    string,
    { government_fee_cad: number | null; hst_cad: number | null }
  >();
  for (const r of retainers ?? []) {
    if (r.case_id && r.signed_at && !r.voided_at) {
      signedRetainerByCase.set(r.case_id, {
        government_fee_cad: r.government_fee_cad,
        hst_cad: r.hst_cad,
      });
    }
  }

  const immigrationByClient = new Map<
    string,
    {
      inCanada: boolean | null;
      status: ImmigrationStatusType | null;
      expiry: string | null;
    }
  >();
  for (const row of clientsImmigration ?? []) {
    const r = row as Record<string, unknown>;
    immigrationByClient.set(r.id as string, {
      inCanada: (r.immigration_in_canada as boolean | null) ?? null,
      status: (r.immigration_status as ImmigrationStatusType | null) ?? null,
      expiry: (r.immigration_status_expiry as string | null) ?? null,
    });
  }

  const now = new Date();
  const chipByCase = new Map<string, ReturnType<typeof computeActionChip>>();
  const docsByCase = new Map<
    string,
    { required: number; received: number; awaitingReview: number }
  >();
  for (const row of chipRows ?? []) {
    if (!row.case_id) continue;
    const input = chipInputFromViewRow(row, now);
    if (input) chipByCase.set(row.case_id, computeActionChip(input));
    const uploaded = row.uploaded_docs ?? 0;
    docsByCase.set(row.case_id, {
      required: row.required_docs ?? 0,
      received: uploaded + (row.accepted_docs ?? 0),
      awaitingReview: uploaded,
    });
  }

  return rows.map((c): EnrichedCard => {
    const signedRetainer = signedRetainerByCase.get(c.id) ?? null;
    const total = computeCaseFeeBreakdown(c, signedRetainer).totalCad;
    const collected = collectedByCase.get(c.id) ?? 0;
    const immigration = immigrationByClient.get(c.client_id);
    const risk = immigration
      ? deriveSubmissionRisk({
          inCanada: immigration.inCanada,
          status: immigration.status,
          expiry: immigration.expiry,
          caseStatus: c.status,
          now,
        })
      : null;

    const card = deriveBoardCard({
      id: c.id,
      caseNumber: c.case_number,
      clientName: c.client?.legal_name_full ?? "Unknown client",
      serviceName: serviceNameById.get(c.service_type_id) ?? null,
      status: c.status,
      priority: c.priority,
      workerId: c.assigned_paralegal ?? null,
      workerName: c.assigned_paralegal
        ? (staffNameById.get(c.assigned_paralegal) ?? null)
        : null,
      updatedAt: c.updated_at,
      submittedAt: c.submitted_at ?? null,
      chip: chipByCase.get(c.id) ?? null,
      risk,
      docs:
        docsByCase.get(c.id) ?? { required: 0, received: 0, awaitingReview: 0 },
      payment: { totalCad: total, collectedCad: collected },
      now,
    });

    return {
      card,
      outstandingCad: Math.max(0, total - collected),
      retainerSigned: signedRetainer !== null,
      awaitingReview: docsByCase.get(c.id)?.awaitingReview ?? 0,
      daysUntilExpiry: risk?.daysUntilExpiry ?? null,
    };
  });
}
