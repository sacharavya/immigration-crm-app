import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  deriveWorklistRow,
  segmentCounts,
  SORT_FNS,
  type RawClientRow,
} from "@/lib/clients/worklist";
import { createClient } from "@/lib/supabase/server";

import { WorklistShell } from "./_components/worklist-shell";

export const dynamic = "force-dynamic";

function isUuid(v: string | undefined): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}

type Props = {
  searchParams: Promise<{
    segment?: string;
    sort?: string;
    q?: string;
    owner?: string;
    stage?: string;
    service?: string;
    imm_status?: string;
    citizenship?: string;
    expiry?: string;
  }>;
};

export default async function ClientsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_clients")) redirect("/dashboard");

  const sp = await searchParams;
  const activeSegment = sp.segment ?? "all";
  const activeSort = sp.sort ?? "urgency";
  const searchQuery = sp.q?.trim().toLowerCase() ?? "";
  const filterOwner = isUuid(sp.owner) ? sp.owner : null;
  const filterStages = sp.stage ? sp.stage.split(",").filter(Boolean) : [];
  const filterServices = sp.service ? sp.service.split(",").filter(Boolean) : [];
  const filterImmStatuses = sp.imm_status ? sp.imm_status.split(",").filter(Boolean) : [];
  const filterCitizenships = sp.citizenship ? sp.citizenship.split(",").filter(Boolean) : [];
  const filterExpiry = sp.expiry ?? null;

  const supabase = await createClient();

  // ── Fetch all data in parallel ─────────────────────────────────
  const [
    { data: clients },
    { data: casesRaw },
    { data: tasksRaw },
    { data: eventsRaw },
    { data: docsRequired },
    { data: docsUploaded },
    { data: staffList },
    { data: serviceTypes },
    { data: countries },
  ] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select(
        "id, client_number, legal_name_full, email, phone_primary, country_of_citizenship, country_of_residence, assigned_rcic, immigration_status, immigration_status_expiry, created_at, source",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500) as unknown as Promise<{ data: Array<{
        id: string; client_number: string; legal_name_full: string;
        email: string | null; phone_primary: string | null;
        country_of_citizenship: string | null; country_of_residence: string | null;
        assigned_rcic: string | null;
        immigration_status: string | null; immigration_status_expiry: string | null;
        created_at: string; source: string | null;
      }> | null }>,
    supabase
      .schema("crm")
      .from("cases")
      .select("id, client_id, status, service_type_id, assigned_rcic, submitted_at")
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("tasks")
      .select("client_id, case_id, title, due_date, status")
      .is("deleted_at", null)
      .in("status", ["open", "in_progress"]),
    supabase
      .schema("crm")
      .from("case_events")
      .select("case_id, event_type, event_data, created_at")
      .in("event_type", [
        "additional_info_requested",
        "additional_documents_requested",
        "biometrics_requested",
        "status_changed",
      ]),
    supabase
      .schema("crm")
      .from("case_required_documents")
      .select("case_id, document_code"),
    supabase
      .schema("files")
      .from("documents")
      .select("case_id, document_code, status")
      .is("deleted_at", null)
      .in("status", ["uploaded", "under_review", "accepted"]),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("first_name"),
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, name")
      .is("deactivated_at", null)
      .order("name"),
    supabase
      .schema("ref")
      .from("countries")
      .select("code, name")
      .order("name"),
  ]);

  // ── JS joins ───────────────────────────────────────────────────
  type ClientCaseInfo = {
    total: number;
    open: number;
    // Most recent open case (drives the active workflow)
    latestOpenStatus: string | null;
    latestOpenId: string | null;
    latestOpenServiceTypeId: string | null;
    // Most recent case overall (open or closed, by created_at)
    mostRecentStatus: string | null;
    mostRecentServiceTypeId: string | null;
    mostRecentCreatedAt: string | null;
    // Latest decided (approved or refused) case's service type
    decisionServiceTypeId: string | null;
    lastDecisionStatus: string | null;
  };
  const casesByClient = new Map<string, ClientCaseInfo>();
  const caseClientMap = new Map<string, string>();

  // Sort cases by created_at so the last one processed is the most recent
  const sortedCases = [...(casesRaw ?? [])].sort(
    (a, b) => (a.submitted_at ?? a.id).localeCompare(b.submitted_at ?? b.id),
  );

  for (const c of sortedCases) {
    caseClientMap.set(c.id, c.client_id);
    const prev: ClientCaseInfo = casesByClient.get(c.client_id) ?? {
      total: 0, open: 0,
      latestOpenStatus: null, latestOpenId: null, latestOpenServiceTypeId: null,
      mostRecentStatus: null, mostRecentServiceTypeId: null, mostRecentCreatedAt: null,
      decisionServiceTypeId: null, lastDecisionStatus: null,
    };
    prev.total++;

    // Track open cases
    if (c.status !== "closed") {
      prev.open++;
      prev.latestOpenStatus = c.status;
      prev.latestOpenId = c.id;
      prev.latestOpenServiceTypeId = c.service_type_id;
    }

    // Always update most recent case (open or closed)
    prev.mostRecentStatus = c.status;
    prev.mostRecentServiceTypeId = c.service_type_id;

    // Track decision outcomes
    if (c.status === "passport_requested") {
      prev.lastDecisionStatus = "passport_requested";
      prev.decisionServiceTypeId = c.service_type_id;
    } else if (c.status === "refused") {
      prev.lastDecisionStatus = "refused";
      prev.decisionServiceTypeId = c.service_type_id;
    }

    casesByClient.set(c.client_id, prev);
  }

  // Check case events for decision milestones (catches cases that
  // already moved to closed after the decision was recorded).
  // Also look up the case's service_type_id for decided cases so
  // immigration_status_detail can show the service type name.
  const caseServiceTypeMap = new Map(
    (casesRaw ?? []).map((c) => [c.id, c.service_type_id]),
  );
  for (const ev of eventsRaw ?? []) {
    if (ev.event_type !== "status_changed") continue;
    const data = ev.event_data as { milestone?: string } | null;
    if (!data?.milestone) continue;
    const clientId = caseClientMap.get(ev.case_id);
    if (!clientId) continue;
    const info = casesByClient.get(clientId);
    if (!info) continue;
    if (data.milestone === "decision_approved") {
      info.lastDecisionStatus = "passport_requested";
      // Set the decided service type so the worklist can show it
      if (!info.decisionServiceTypeId) {
        info.decisionServiceTypeId = caseServiceTypeMap.get(ev.case_id) ?? null;
      }
    }
    if (data.milestone === "decision_refused" && !info.lastDecisionStatus) {
      info.lastDecisionStatus = "refused";
      if (!info.decisionServiceTypeId) {
        info.decisionServiceTypeId = caseServiceTypeMap.get(ev.case_id) ?? null;
      }
    }
  }

  // Build service type display: "Category - Service Type Name"
  const serviceNameById = new Map((serviceTypes ?? []).map((s) => [s.id, s.name]));
  const countryNameByCode = new Map((countries ?? []).map((c) => [c.code, c.name]));

  const tasksByClient = new Map<string, { due: string; title: string }>();
  for (const t of tasksRaw ?? []) {
    if (!t.due_date) continue;
    const clientId = t.client_id ?? caseClientMap.get(t.case_id ?? "");
    if (!clientId) continue;
    const prev = tasksByClient.get(clientId);
    if (!prev || t.due_date < prev.due) {
      tasksByClient.set(clientId, { due: t.due_date, title: t.title });
    }
  }

  // Only count IRCC requests from OPEN cases (not resolved/closed ones)
  const openCaseIds = new Set(
    (casesRaw ?? []).filter((c) => c.status !== "closed").map((c) => c.id),
  );
  const irccByClient = new Map<string, { due: string | null }>();
  for (const ev of eventsRaw ?? []) {
    if (ev.event_type === "status_changed") continue; // handled separately
    if (!openCaseIds.has(ev.case_id)) continue; // skip closed case events
    const clientId = caseClientMap.get(ev.case_id);
    if (!clientId) continue;
    const data = ev.event_data as { due_date?: string; overall_due_date?: string } | null;
    const due = data?.due_date ?? data?.overall_due_date ?? null;
    const prev = irccByClient.get(clientId);
    if (!prev) {
      irccByClient.set(clientId, { due });
    } else if (due && (!prev.due || due < prev.due)) {
      irccByClient.set(clientId, { due });
    }
  }

  const requiredByCaseDoc = new Set<string>();
  for (const d of docsRequired ?? []) {
    requiredByCaseDoc.add(`${d.case_id}:${d.document_code}`);
  }
  const uploadedByCaseDoc = new Set<string>();
  for (const d of docsUploaded ?? []) {
    if (d.case_id && d.document_code) {
      uploadedByCaseDoc.add(`${d.case_id}:${d.document_code}`);
    }
  }
  const missingDocsByClient = new Map<string, number>();
  for (const key of requiredByCaseDoc) {
    if (!uploadedByCaseDoc.has(key)) {
      const caseId = key.split(":")[0];
      const clientId = caseClientMap.get(caseId);
      if (clientId) {
        missingDocsByClient.set(clientId, (missingDocsByClient.get(clientId) ?? 0) + 1);
      }
    }
  }

  // ── Build raw rows and derive ──────────────────────────────────
  const rawRows: RawClientRow[] = (clients ?? []).map((c) => {
    const caseInfo = casesByClient.get(c.id);
    const taskInfo = tasksByClient.get(c.id);
    const irccInfo = irccByClient.get(c.id);
    return {
      id: c.id,
      client_number: c.client_number,
      legal_name_full: c.legal_name_full,
      email: c.email,
      phone_primary: c.phone_primary,
      country_of_citizenship: c.country_of_citizenship,
      country_of_residence: c.country_of_residence
        ? countryNameByCode.get(c.country_of_residence) ?? c.country_of_residence
        : null,
      assigned_rcic: c.assigned_rcic,
      immigration_status: c.immigration_status as RawClientRow["immigration_status"],
      immigration_status_expiry: c.immigration_status_expiry,
      created_at: c.created_at,
      source: c.source,
      total_cases: caseInfo?.total ?? 0,
      open_cases: caseInfo?.open ?? 0,
      // Prefer the open case status (active workflow), fall back to the
      // most recent case (closed cases still show their last status)
      latest_case_status: caseInfo?.latestOpenStatus ?? caseInfo?.mostRecentStatus ?? null,
      latest_case_id: caseInfo?.latestOpenId ?? null,
      latest_case_service_type_id: caseInfo?.latestOpenServiceTypeId ?? caseInfo?.mostRecentServiceTypeId ?? null,
      nearest_task_due: taskInfo?.due ?? null,
      nearest_task_title: taskInfo?.title ?? null,
      has_ircc_request: irccInfo !== undefined,
      ircc_request_due: irccInfo?.due ?? null,
      missing_required_docs: missingDocsByClient.get(c.id) ?? 0,
      immigration_status_detail: caseInfo?.decisionServiceTypeId
        ? serviceNameById.get(caseInfo.decisionServiceTypeId) ?? null
        : null,
      last_decision_status: caseInfo?.lastDecisionStatus ?? null,
    };
  });

  const allRows = rawRows.map(deriveWorklistRow);
  const counts = segmentCounts(allRows);

  // ── Apply filters ──────────────────────────────────────────────
  let filtered = allRows;

  if (activeSegment === "attention") filtered = filtered.filter((r) => r.urgency !== "normal");
  else if (activeSegment === "active") filtered = filtered.filter((r) => r.segment === "active");
  else if (activeSegment === "leads") filtered = filtered.filter((r) => r.segment === "lead");
  else if (activeSegment === "past") filtered = filtered.filter((r) => r.segment === "past");

  if (searchQuery) {
    filtered = filtered.filter(
      (r) =>
        r.legal_name_full.toLowerCase().includes(searchQuery) ||
        r.client_number.toLowerCase().includes(searchQuery) ||
        (r.email?.toLowerCase().includes(searchQuery) ?? false),
    );
  }

  if (filterOwner) filtered = filtered.filter((r) => r.assigned_rcic === filterOwner);
  if (filterStages.length > 0) filtered = filtered.filter((r) => filterStages.includes(r.stage));
  if (filterServices.length > 0) filtered = filtered.filter((r) => r.latest_case_service_type_id && filterServices.includes(r.latest_case_service_type_id));
  if (filterImmStatuses.length > 0) {
    const hasNull = filterImmStatuses.includes("not_on_file");
    const vals = filterImmStatuses.filter((s) => s !== "not_on_file");
    filtered = filtered.filter((r) => (hasNull && !r.immigration_status) || (r.immigration_status && vals.includes(r.immigration_status)));
  }
  if (filterCitizenships.length > 0) filtered = filtered.filter((r) => r.country_of_citizenship && filterCitizenships.includes(r.country_of_citizenship));
  if (filterExpiry === "expired") {
    filtered = filtered.filter((r) => r.immigration_status_expiry && new Date(r.immigration_status_expiry) < new Date());
  } else if (filterExpiry) {
    const days = parseInt(filterExpiry, 10);
    if (!isNaN(days)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      filtered = filtered.filter((r) => r.immigration_status_expiry && new Date(r.immigration_status_expiry) <= cutoff && new Date(r.immigration_status_expiry) >= new Date());
    }
  }

  const sortFn = SORT_FNS[activeSort] ?? SORT_FNS.urgency;
  filtered.sort(sortFn);

  // ── Lookups for display ────────────────────────────────────────
  const staffById = Object.fromEntries(
    (staffList ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim()]),
  );
  const distinctCitizenships = Array.from(new Set((clients ?? []).map((c) => c.country_of_citizenship).filter(Boolean)))
    .map((code) => ({ code: code!, name: countryNameByCode.get(code!) ?? code! }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const params = {
    segment: activeSegment !== "all" ? activeSegment : null,
    sort: activeSort !== "urgency" ? activeSort : null,
    q: searchQuery || null,
    owner: filterOwner,
    stage: filterStages.length > 0 ? filterStages.join(",") : null,
    service: filterServices.length > 0 ? filterServices.join(",") : null,
    imm_status: filterImmStatuses.length > 0 ? filterImmStatuses.join(",") : null,
    citizenship: filterCitizenships.length > 0 ? filterCitizenships.join(",") : null,
    expiry: filterExpiry,
  };

  return (
    <div className="space-y-4 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Clients</h1>
        <p className="mt-1 text-sm text-stone-500">
          Worklist sorted by urgency. Clients needing attention surface first.
        </p>
      </div>

      <WorklistShell
        rows={filtered}
        counts={counts}
        params={params}
        staffById={staffById}
        ownerOptions={(staffList ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }))}
        serviceTypeOptions={(serviceTypes ?? []).map((s) => ({ id: s.id, name: s.name }))}
        citizenshipOptions={distinctCitizenships}
      />
    </div>
  );
}
