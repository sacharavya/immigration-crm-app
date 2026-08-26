import Link from "next/link";
import { redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
} from "@/lib/cases/action-chip";
import {
  deriveBoardCard,
  matchesAttention,
  type AttentionFilter,
  type BoardCardModel,
} from "@/lib/cases/board-card";
import { computeCaseFeeBreakdown } from "@/lib/cases/fee-totals";
import { deriveSubmissionRisk } from "@/lib/cases/submission-risk";
import { isPaymentVerified } from "@/lib/payments/verified";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { CaseStatus } from "@/lib/utils/phase";
import type { ImmigrationStatusType } from "@/lib/validators/client-immigration";

import { CasesBoardView } from "./_components/cases-board-view";
import { CasesFilters, type StaffPick } from "./_components/cases-filters";
import { CasesListView } from "./_components/cases-list-view";
import { ViewToggle, type CasesView } from "./_components/view-toggle";

type Props = {
  searchParams: Promise<{
    q?: string;
    view?: string;
    phase?: string;
    assignee?: string;
    service_type?: string;
    attention?: string;
  }>;
};

const VALID_VIEWS: ReadonlyArray<CasesView> = ["list", "board"];
const VALID_ATTENTION: ReadonlyArray<AttentionFilter> = [
  "at_risk",
  "stalled",
  "firm",
  "priority",
];

const PHASE_TO_STATUSES: Record<number, CaseStatus[]> = {
  1: ["retainer_pending"],
  2: ["documentation_in_progress"],
  3: ["documentation_review"],
  4: ["submitted_to_ircc"],
  5: ["passport_requested", "refused"],
};

export default async function CasesPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");

  const sp = await searchParams;
  const view: CasesView = (VALID_VIEWS as readonly string[]).includes(
    sp.view ?? "",
  )
    ? (sp.view as CasesView)
    : "board";

  const searchQuery = sp.q?.trim().toLowerCase() ?? "";
  const phaseParam = Number.parseInt(sp.phase ?? "", 10);
  const phaseFilter = phaseParam >= 1 && phaseParam <= 5 ? phaseParam : null;
  const assigneeFilter = sp.assignee?.trim() || null;
  const serviceTypeFilter = sp.service_type?.trim() || null;
  const attentionFilter: AttentionFilter | null = (
    VALID_ATTENTION as readonly string[]
  ).includes(sp.attention ?? "")
    ? (sp.attention as AttentionFilter)
    : null;

  const canViewCases = staffCan(me, "view_cases");
  const supabase = await createClient();

  let query = supabase
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
        assigned_rcic,
        assigned_paralegal,
        client:clients(legal_name_full, client_number, email, phone_primary)
      `,
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  // Hide closed cases by default (archive semantic). A phase filter scopes to
  // that phase's statuses instead.
  if (phaseFilter === null) {
    query = query.neq("status", "closed");
  } else {
    query = query.in("status", PHASE_TO_STATUSES[phaseFilter]);
  }
  // Assigned filters by the people on the case - either role.
  if (assigneeFilter) {
    query = query.or(
      `assigned_rcic.eq.${assigneeFilter},assigned_paralegal.eq.${assigneeFilter}`,
    );
  }
  if (serviceTypeFilter) {
    query = query.eq("service_type_id", serviceTypeFilter);
  }

  const { data: casesRaw } = canViewCases
    ? await query
    : { data: [] as never[] };

  // Free-text search across case number and the client's identity fields.
  // Phone matches on digits only so "437 733" finds "(437) 733-7525".
  const qDigits = searchQuery.replace(/\D/g, "");
  const cases = searchQuery
    ? (casesRaw ?? []).filter((c) => {
        const client = c.client;
        if (c.case_number.toLowerCase().includes(searchQuery)) return true;
        if (client?.legal_name_full?.toLowerCase().includes(searchQuery)) {
          return true;
        }
        if (client?.client_number?.toLowerCase().includes(searchQuery)) {
          return true;
        }
        if (client?.email?.toLowerCase().includes(searchQuery)) return true;
        if (
          qDigits.length >= 3 &&
          (client?.phone_primary ?? "").replace(/\D/g, "").includes(qDigits)
        ) {
          return true;
        }
        return false;
      })
    : casesRaw;

  const caseIds = (cases ?? []).map((c) => c.id);
  const clientIds = [...new Set((cases ?? []).map((c) => c.client_id))];
  const serviceTypeIds = [
    ...new Set((cases ?? []).map((c) => c.service_type_id)),
  ];

  const [
    { data: payments },
    { data: retainersForCases },
    { data: serviceTypes },
    { data: allStaff },
    { data: allServiceTypes },
    { data: chipRows },
    { data: clientsImmigration },
  ] = await Promise.all([
    caseIds.length
      ? supabase
          .schema("crm")
          .from("payments")
          .select(
            "case_id, amount_cad, is_refund, client_uploaded_at, verified_at",
          )
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({
          data: [] as Array<{
            case_id: string | null;
            amount_cad: number;
            is_refund: boolean;
            client_uploaded_at: string | null;
            verified_at: string | null;
          }>,
        }),
    caseIds.length
      ? supabase
          .schema("crm")
          .from("retainer_agreements")
          .select(
            "case_id, status, government_fee_cad, hst_cad, signed_at, voided_at",
          )
          .in("case_id", caseIds)
          .is("deleted_at", null)
      : Promise.resolve({
          data: [] as Array<{
            case_id: string;
            government_fee_cad: number | null;
            hst_cad: number | null;
            signed_at: string | null;
            voided_at: string | null;
          }>,
        }),
    serviceTypeIds.length
      ? supabase
          .schema("ref")
          .from("service_types")
          .select("id, name")
          .in("id", serviceTypeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, name")
      .is("deactivated_at", null)
      .order("name", { ascending: true }),
    caseIds.length
      ? supabase
          .schema("crm")
          .from("v_case_chip_inputs")
          .select("*")
          .in("case_id", caseIds)
      : Promise.resolve({
          data: [] as Array<
            Database["crm"]["Views"]["v_case_chip_inputs"]["Row"]
          >,
        }),
    // Immigration status drives the at-risk signal. Selected with "*" so a
    // not-yet-applied migration column (immigration_in_canada) degrades to
    // undefined instead of erroring the whole query, mirroring the case page.
    clientIds.length
      ? supabase.schema("crm").from("clients").select("*").in("id", clientIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
  ]);

  const serviceNameById = new Map(
    (serviceTypes ?? []).map((s) => [s.id, s.name]),
  );
  const assigneeById = new Map(
    (allStaff ?? []).map((a) => [a.id, `${a.first_name} ${a.last_name}`.trim()]),
  );

  const assigneeOptions: StaffPick[] = (allStaff ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`.trim(),
  }));

  // Only VERIFIED payments contribute to the paid/partial/unpaid signal.
  const collectedByCase = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!isPaymentVerified(p)) continue;
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id!,
      (collectedByCase.get(p.case_id!) ?? 0) + sign * Number(p.amount_cad),
    );
  }

  // Per-case signed retainer snapshot for the fee-totals helper.
  const signedRetainerByCase = new Map<
    string,
    { government_fee_cad: number | null; hst_cad: number | null }
  >();
  for (const r of retainersForCases ?? []) {
    if (r.signed_at && !r.voided_at) {
      signedRetainerByCase.set(r.case_id, {
        government_fee_cad: r.government_fee_cad,
        hst_cad: r.hst_cad,
      });
    }
  }

  // Immigration facts by client id (in_canada may be absent pre-migration).
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
    const id = r.id as string;
    immigrationByClient.set(id, {
      inCanada: (r.immigration_in_canada as boolean | null) ?? null,
      status: (r.immigration_status as ImmigrationStatusType | null) ?? null,
      expiry: (r.immigration_status_expiry as string | null) ?? null,
    });
  }

  // Chip + raw document counts per case, keyed by case id.
  const now = new Date();
  const chipByCase = new Map<
    string,
    ReturnType<typeof computeActionChip>
  >();
  const docsByCase = new Map<
    string,
    { required: number; received: number; awaitingReview: number }
  >();
  for (const row of chipRows ?? []) {
    if (!row.case_id) continue;
    const input = chipInputFromViewRow(row, now);
    if (input) chipByCase.set(row.case_id, computeActionChip(input));
    const required = row.required_docs ?? 0;
    const uploaded = row.uploaded_docs ?? 0;
    const accepted = row.accepted_docs ?? 0;
    // "Received" matches the checklist's itemReceived: a required document with
    // a live uploaded-or-accepted file. "Awaiting review" is the uploaded-but-
    // not-yet-accepted subset - the firm's new-uploads queue.
    docsByCase.set(row.case_id, {
      required,
      received: uploaded + accepted,
      awaitingReview: uploaded,
    });
  }

  // Derive the full card model for every case. Both views render this.
  let cards: BoardCardModel[] = (cases ?? []).map((c) => {
    const total = computeCaseFeeBreakdown(
      c,
      signedRetainerByCase.get(c.id) ?? null,
    ).totalCad;
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
    return deriveBoardCard({
      id: c.id,
      caseNumber: c.case_number,
      clientName: c.client?.legal_name_full ?? "Unknown client",
      serviceName: serviceNameById.get(c.service_type_id) ?? null,
      status: c.status,
      priority: c.priority,
      workerId: c.assigned_paralegal ?? null,
      workerName: c.assigned_paralegal
        ? (assigneeById.get(c.assigned_paralegal) ?? null)
        : null,
      updatedAt: c.updated_at,
      submittedAt: c.submitted_at ?? null,
      chip: chipByCase.get(c.id) ?? null,
      risk,
      docs:
        docsByCase.get(c.id) ?? { required: 0, received: 0, awaitingReview: 0 },
      payment: { totalCad: total, collectedCad: collectedByCase.get(c.id) ?? 0 },
      now,
    });
  });

  // The attention filter keys off the computed signal, so it is applied after
  // derivation rather than as a SQL predicate.
  if (attentionFilter) {
    cards = cards.filter((card) => matchesAttention(card, attentionFilter));
  }

  const totalCases = cards.length;
  const isFiltered =
    phaseFilter !== null ||
    assigneeFilter !== null ||
    serviceTypeFilter !== null ||
    attentionFilter !== null;

  const serviceTypeOptions = (allServiceTypes ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <main className="space-y-6 px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cases
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCases === 0
              ? isFiltered
                ? "No cases match these filters."
                : "No active cases yet."
              : `${totalCases} ${isFiltered ? "matching" : "active"} case${totalCases === 1 ? "" : "s"}.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle activeView={view} />
          <CanServer staff={me} permission="create_cases">
            <Link
              href="/dashboard/cases/new"
              className={`${buttonVariants()} gap-1.5`}
            >
              + New case
            </Link>
          </CanServer>
        </div>
      </div>

      <CasesFilters
        q={sp.q?.trim() ?? ""}
        view={view}
        phase={phaseFilter}
        assignee={assigneeFilter}
        assigneeOptions={assigneeOptions}
        serviceType={serviceTypeFilter}
        serviceTypeOptions={serviceTypeOptions}
        attention={attentionFilter}
      />

      {view === "list" ? (
        <CasesListView rows={cards} />
      ) : (
        <CasesBoardView cases={cards} />
      )}
    </main>
  );
}
