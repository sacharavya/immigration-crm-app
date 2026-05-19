import Link from "next/link";
import { redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
  type ChipOutput,
} from "@/lib/cases/action-chip";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { CaseStatus } from "@/lib/utils/phase";

import {
  CasesBoardView,
  type BoardCase,
} from "./_components/cases-board-view";
import {
  CasesFilters,
  type StaffPick,
} from "./_components/cases-filters";
import {
  CasesListView,
  type CaseRow,
} from "./_components/cases-list-view";
import { ViewToggle, type CasesView } from "./_components/view-toggle";

type Props = {
  searchParams: Promise<{
    view?: string;
    phase?: string;
    assignee?: string;
    service_type?: string;
  }>;
};

const VALID_VIEWS: ReadonlyArray<CasesView> = ["list", "board"];

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

  const phaseParam = Number.parseInt(sp.phase ?? "", 10);
  const phaseFilter =
    phaseParam >= 1 && phaseParam <= 5 ? phaseParam : null;
  const assigneeFilter = sp.assignee?.trim() || null;
  const serviceTypeFilter = sp.service_type?.trim() || null;

  const canViewCases = staffCan(me, "view_cases");
  const supabase = await createClient();

  const baseQuery = supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        status,
        updated_at,
        quoted_fee_cad,
        retainer_minimum_cad,
        service_type_id,
        assigned_rcic,
        client:clients(legal_name_full)
      `,
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(50);

  let query = baseQuery;
  // Hide closed cases from the default list (archive semantic). Phase
  // filter for phase 6 still surfaces them via the `.in("status", ...)`
  // override below since 'closed' is in PHASE_TO_STATUSES[6] if the user
  // has explicitly chosen to view that phase.
  if (phaseFilter === null) {
    query = query.neq("status", "closed");
  } else {
    query = query.in("status", PHASE_TO_STATUSES[phaseFilter]);
  }
  if (assigneeFilter) {
    query = query.eq("assigned_rcic", assigneeFilter);
  }
  if (serviceTypeFilter) {
    query = query.eq("service_type_id", serviceTypeFilter);
  }

  const { data: cases } = canViewCases
    ? await query
    : { data: [] as never[] };

  const caseIds = (cases ?? []).map((c) => c.id);
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
  ] = await Promise.all([
      caseIds.length
        ? supabase
            .schema("crm")
            .from("payments")
            .select("case_id, amount_cad, is_refund")
            .in("case_id", caseIds)
            .is("deleted_at", null)
        : Promise.resolve({
            data: [] as Array<{
              case_id: string | null;
              amount_cad: number;
              is_refund: boolean;
            }>,
          }),
      caseIds.length
        ? supabase
            .schema("crm")
            .from("retainer_agreements")
            .select("case_id, status")
            .in("case_id", caseIds)
            .is("deleted_at", null)
        : Promise.resolve({
            data: [] as Array<{ case_id: string; status: string }>,
          }),
      serviceTypeIds.length
        ? supabase
            .schema("ref")
            .from("service_types")
            .select("id, name")
            .in("id", serviceTypeIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; name: string }>,
          }),
      // All active staff — drives the assignee filter options and the
      // assignee-name lookup for case rows. Fetched unconditionally so the
      // dropdown doesn't lose options when a filter narrows the case list.
      supabase
        .schema("crm")
        .from("staff")
        .select("id, first_name, last_name")
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("last_name", { ascending: true }),
      // All currently usable service types — drives the service-type
      // filter options. Active only (no deactivation date in the past).
      supabase
        .schema("ref")
        .from("service_types")
        .select("id, name")
        .is("deactivated_at", null)
        .order("name", { ascending: true }),
      // Action-chip inputs for every visible case. One round-trip against
      // crm.v_case_chip_inputs; the chip is computed per row below.
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
    ]);

  const serviceNameById = new Map(
    (serviceTypes ?? []).map((s) => [s.id, s.name]),
  );
  const assigneeById = new Map(
    (allStaff ?? []).map((a) => [
      a.id,
      `${a.first_name} ${a.last_name}`.trim(),
    ]),
  );

  const assigneeOptions: StaffPick[] = (allStaff ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`.trim(),
  }));

  const collectedByCase = new Map<string, number>();
  for (const p of payments ?? []) {
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id!,
      (collectedByCase.get(p.case_id!) ?? 0) + sign * Number(p.amount_cad),
    );
  }

  const retainerStatusByCase = new Map(
    (retainersForCases ?? []).map((r) => [r.case_id, r.status]),
  );

  const chipNow = new Date();
  const chipById = new Map<string, ChipOutput>();
  for (const row of chipRows ?? []) {
    if (!row.case_id) continue;
    const input = chipInputFromViewRow(row, chipNow);
    if (input) chipById.set(row.case_id, computeActionChip(input));
  }

  // Project the same dataset into both view shapes. List needs payment
  // progress; board doesn't. Build both unconditionally — cheap on 50 rows
  // and means the toggle doesn't trigger another server roundtrip.
  const listRows: CaseRow[] = (cases ?? []).map((c) => {
    const quoted = Number(c.quoted_fee_cad);
    const collected = collectedByCase.get(c.id) ?? 0;
    const progress =
      quoted > 0 ? Math.min(100, Math.round((collected / quoted) * 100)) : 0;
    const retainerStatus = retainerStatusByCase.get(c.id) ?? null;
    const retainerSigned =
      retainerStatus === "signed" || retainerStatus === "uploaded";
    const retainerMin =
      c.retainer_minimum_cad === null
        ? null
        : Number(c.retainer_minimum_cad);
    const retainerSatisfied =
      retainerMin === null ? collected > 0 : collected >= retainerMin;
    return {
      id: c.id,
      caseNumber: c.case_number,
      status: c.status,
      clientName: c.client?.legal_name_full ?? "—",
      serviceName: serviceNameById.get(c.service_type_id) ?? "—",
      assigneeId: c.assigned_rcic ?? null,
      assigneeName: assigneeById.get(c.assigned_rcic) ?? null,
      paymentProgress: progress,
      retainerSigned,
      retainerSatisfied,
      chip: chipById.get(c.id) ?? null,
    };
  });

  const boardCases: BoardCase[] = (cases ?? []).map((c) => {
    const collected = collectedByCase.get(c.id) ?? 0;
    const retainerStatus = retainerStatusByCase.get(c.id) ?? null;
    const retainerSigned =
      retainerStatus === "signed" || retainerStatus === "uploaded";
    const retainerMin =
      c.retainer_minimum_cad === null
        ? null
        : Number(c.retainer_minimum_cad);
    const retainerSatisfied =
      retainerMin === null ? collected > 0 : collected >= retainerMin;
    return {
      id: c.id,
      caseNumber: c.case_number,
      status: c.status as CaseStatus,
      clientName: c.client?.legal_name_full ?? "—",
      serviceName: serviceNameById.get(c.service_type_id) ?? "—",
      assigneeId: c.assigned_rcic ?? null,
      assigneeName: assigneeById.get(c.assigned_rcic) ?? null,
      retainerSigned,
      retainerSatisfied,
      chip: chipById.get(c.id) ?? null,
    };
  });

  const totalCases = listRows.length;
  const isFiltered =
    phaseFilter !== null ||
    assigneeFilter !== null ||
    serviceTypeFilter !== null;

  const serviceTypeOptions = (allServiceTypes ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Cases
          </h1>
          <p className="mt-1 text-sm text-stone-500">
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
              className={`${buttonVariants()} gap-1.5 shadow-sm`}
            >
              + New case
            </Link>
          </CanServer>
        </div>
      </div>

      <CasesFilters
        view={view}
        phase={phaseFilter}
        assignee={assigneeFilter}
        assigneeOptions={assigneeOptions}
        serviceType={serviceTypeFilter}
        serviceTypeOptions={serviceTypeOptions}
      />

      {view === "list" ? (
        <CasesListView rows={listRows} />
      ) : (
        <CasesBoardView cases={boardCases} />
      )}
    </main>
  );
}
