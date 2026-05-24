import { Archive as ArchiveIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { ArchiveFilters } from "../_components/archive-filters";
import {
  ArchiveListView,
  type ArchiveRow,
  type DecisionOutcome,
} from "../_components/archive-list-view";

export const dynamic = "force-dynamic";

const DECISION_VALUES: ReadonlyArray<DecisionOutcome> = [
  "approved",
  "refused",
  "withdrawn",
  "other",
];

type Props = {
  searchParams: Promise<{
    assignee?: string;
    service_type?: string;
    decision?: string;
  }>;
};

export default async function CasesArchivePage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_cases")) redirect("/dashboard?error=forbidden");

  const sp = await searchParams;
  const assigneeFilter = sp.assignee?.trim() || null;
  const serviceTypeFilter = sp.service_type?.trim() || null;
  const decisionFilter: DecisionOutcome | null =
    sp.decision && (DECISION_VALUES as readonly string[]).includes(sp.decision)
      ? (sp.decision as DecisionOutcome)
      : null;

  const supabase = await createClient();

  // Pull closed cases. We filter by assignee + service at the DB level;
  // decision outcome is derived from case_events in JS below.
  let query = supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        status,
        updated_at,
        closed_at,
        decided_at,
        service_type_id,
        assigned_rcic,
        client:clients(legal_name_full)
      `,
    )
    .eq("status", "closed")
    .is("deleted_at", null)
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(200);

  if (assigneeFilter) query = query.eq("assigned_rcic", assigneeFilter);
  if (serviceTypeFilter) query = query.eq("service_type_id", serviceTypeFilter);

  const { data: cases } = await query;
  const caseList = cases ?? [];
  const caseIds = caseList.map((c) => c.id);

  // Decision-relevant events for derivation. status_changed events with
  // milestone decision_approved/refused tell us the outcome before close;
  // withdrawal_requested marks a client-initiated withdrawal regardless of
  // status path.
  const { data: events } = caseIds.length
    ? await supabase
        .schema("crm")
        .from("case_events")
        .select("case_id, event_type, event_data, occurred_at")
        .in("case_id", caseIds)
        .in("event_type", ["status_changed", "withdrawal_requested"])
        .order("occurred_at", { ascending: false })
    : { data: [] };

  // Group by case + derive decision.
  const decisionByCase = new Map<string, DecisionOutcome>();
  for (const e of events ?? []) {
    if (!e.case_id || decisionByCase.has(e.case_id)) continue;
    const outcome = outcomeOf(e.event_type, e.event_data);
    if (outcome) decisionByCase.set(e.case_id, outcome);
  }

  // Fetch service-type + assignee + decision filter options.
  const serviceTypeIds = [...new Set(caseList.map((c) => c.service_type_id))];
  const [{ data: serviceTypes }, { data: allStaff }, { data: allServiceTypes }] =
    await Promise.all([
      serviceTypeIds.length
        ? supabase
            .schema("ref")
            .from("service_types")
            .select("id, name")
            .in("id", serviceTypeIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; name: string }>,
          }),
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
    ]);

  const serviceNameById = new Map(
    (serviceTypes ?? []).map((s) => [s.id, s.name]),
  );
  const assigneeById = new Map(
    (allStaff ?? []).map((s) => [
      s.id,
      `${s.first_name} ${s.last_name}`.trim(),
    ]),
  );

  const rowsAll: ArchiveRow[] = caseList.map((c) => ({
    id: c.id,
    caseNumber: c.case_number,
    clientName: c.client?.legal_name_full ?? "—",
    serviceName: serviceNameById.get(c.service_type_id) ?? "—",
    assigneeId: c.assigned_rcic ?? null,
    assigneeName: assigneeById.get(c.assigned_rcic) ?? null,
    decision: decisionByCase.get(c.id) ?? "other",
    closedAt: c.closed_at,
    decidedAt: c.decided_at,
  }));

  const rows = decisionFilter
    ? rowsAll.filter((r) => r.decision === decisionFilter)
    : rowsAll;

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[var(--navy)]">
          <ArchiveIcon className="h-4 w-4" />
          <h1 className="text-xl font-bold tracking-tight">Archive</h1>
        </div>
        <p className="text-sm text-stone-500">
          Closed cases with their final decision. Showing the most recent
          {" "}{rows.length} of {rowsAll.length}.
        </p>
      </header>

      <ArchiveFilters
        assignee={assigneeFilter}
        assigneeOptions={(allStaff ?? []).map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`.trim(),
        }))}
        serviceType={serviceTypeFilter}
        serviceTypeOptions={(allServiceTypes ?? []).map((s) => ({
          id: s.id,
          name: s.name,
        }))}
        decision={decisionFilter}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-stone-500">
            No closed cases match these filters.
          </CardContent>
        </Card>
      ) : (
        <ArchiveListView rows={rows} />
      )}
    </main>
  );
}

function outcomeOf(
  eventType: string,
  eventData: unknown,
): DecisionOutcome | null {
  if (eventType === "withdrawal_requested") return "withdrawn";
  if (eventType === "status_changed" && eventData && typeof eventData === "object") {
    const milestone = (eventData as { milestone?: unknown }).milestone;
    if (milestone === "decision_approved") return "approved";
    if (milestone === "decision_refused") return "refused";
  }
  return null;
}
