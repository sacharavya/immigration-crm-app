import Link from "next/link";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { computeCaseOutstanding } from "@/lib/cases/fee-totals";
import { isPaymentVerified } from "@/lib/payments/verified";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABELS, STATUS_LABEL, phaseIndex } from "@/lib/utils/phase";

import { ReportsFilters } from "./_components/reports-filters";

export const dynamic = "force-dynamic";

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});
const fmtCad = (n: number) => cadFormatter.format(n);
const fmtInt = new Intl.NumberFormat("en-CA").format;

const MONTH_LABEL = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  year: "2-digit",
});

function isIsoDate(v: string | undefined): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isUuid(v: string | undefined): v is string {
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
}
function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

type Props = {
  searchParams: Promise<{
    service_type?: string;
    rcic?: string;
    staff?: string;
    status?: string;
    phase?: string;
    decision?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_reports")) redirect("/dashboard?error=forbidden_view_reports");

  const sp = await searchParams;
  const serviceTypeId = isUuid(sp.service_type) ? sp.service_type! : null;
  const rcicId = isUuid(sp.rcic) ? sp.rcic! : null;
  const staffId = isUuid(sp.staff) ? sp.staff! : null;
  const statusFilter = sp.status || null;
  const phaseFilter = sp.phase ? Number(sp.phase) : null;
  const decisionFilter = sp.decision || null; // "approved" | "refused"
  const fromDate = isIsoDate(sp.from) ? sp.from! : null;
  const toDate = isIsoDate(sp.to) ? sp.to! : null;

  const supabase = await createClient();
  const now = new Date();

  const defaultWindowStartIso = new Date(now.getTime() - 30 * 86400000).toISOString();
  const windowStartIso = fromDate ? `${fromDate}T00:00:00.000Z` : defaultWindowStartIso;
  const windowEndIso = toDate ? `${toDate}T23:59:59.999Z` : now.toISOString();
  const windowStartDate = windowStartIso.slice(0, 10);
  const windowEndDate = windowEndIso.slice(0, 10);
  const windowLabel = fromDate || toDate ? "in range" : "last 30d";

  const revenueStart = fromDate
    ? new Date(`${fromDate}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const revenueEnd = toDate ? new Date(`${toDate}T23:59:59.999Z`) : now;

  // ── Data fetching ──────────────────────────────────────────────
  let casesQuery = supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, case_number, status, service_type_id, assigned_rcic, quoted_fee_cad, government_fee_cad, closed_at, created_at, submitted_at, decided_at",
    )
    .is("deleted_at", null);
  if (serviceTypeId) casesQuery = casesQuery.eq("service_type_id", serviceTypeId);
  if (rcicId) casesQuery = casesQuery.eq("assigned_rcic", rcicId);
  if (staffId) casesQuery = casesQuery.eq("assigned_rcic", staffId);
  if (statusFilter) casesQuery = casesQuery.eq("status", statusFilter as never);

  const [
    { data: cases },
    { data: serviceTypes },
    { data: staff },
    { data: clientsRaw },
  ] = await Promise.all([
    casesQuery,
    supabase.schema("ref").from("service_types").select("id, name").is("deactivated_at", null).order("name"),
    supabase.schema("crm").from("staff").select("id, first_name, last_name, role").is("deleted_at", null).eq("is_active", true).order("last_name"),
    supabase.schema("crm").from("clients").select("id, source, created_at, status").is("deleted_at", null),
  ]);

  let allCases = cases ?? [];
  const caseIdSet = new Set(allCases.map((c) => c.id));
  const serviceNameById = new Map((serviceTypes ?? []).map((s) => [s.id, s.name]));
  const staffById = new Map((staff ?? []).map((s) => [s.id, { name: `${s.first_name} ${s.last_name}`.trim(), role: s.role }]));

  const { data: paymentsRaw } = await supabase
    .schema("crm")
    .from("payments")
    .select("amount_cad, is_refund, received_date, case_id, proof_document_id, client_uploaded_at, verified_at")
    .is("deleted_at", null)
    .gte("received_date", revenueStart.toISOString().slice(0, 10))
    .lte("received_date", revenueEnd.toISOString().slice(0, 10));

  const allPayments = (paymentsRaw ?? []).filter((p) =>
    serviceTypeId || rcicId ? p.case_id !== null && caseIdSet.has(p.case_id) : true,
  );
  const allClients = clientsRaw ?? [];

  // Phase filter (JS-side since phase is derived from status)
  if (phaseFilter !== null) {
    allCases = allCases.filter((c) => phaseIndex(c.status) === phaseFilter);
  }

  // Decision counts from case_events (cases move to closed after decision,
  // so current status won't show passport_requested/refused).
  const caseIds = allCases.map((c) => c.id);
  let approvedEventCount = 0;
  let refusedEventCount = 0;
  const approvedCaseIds = new Set<string>();
  const refusedCaseIds = new Set<string>();
  if (caseIds.length > 0) {
    const { data: decisionEvents } = await supabase
      .schema("crm")
      .from("case_events")
      .select("case_id, event_data")
      .eq("event_type", "status_changed")
      .in("case_id", caseIds);
    for (const ev of decisionEvents ?? []) {
      const data = ev.event_data as { milestone?: string } | null;
      if (data?.milestone === "decision_approved") {
        approvedEventCount++;
        approvedCaseIds.add(ev.case_id);
      }
      if (data?.milestone === "decision_refused") {
        refusedEventCount++;
        refusedCaseIds.add(ev.case_id);
      }
    }
  }

  // Decision filter (JS-side, uses event history)
  if (decisionFilter === "approved") {
    allCases = allCases.filter((c) => approvedCaseIds.has(c.id));
  } else if (decisionFilter === "refused") {
    allCases = allCases.filter((c) => refusedCaseIds.has(c.id));
  } else if (decisionFilter === "pending") {
    allCases = allCases.filter(
      (c) => c.submitted_at !== null && !approvedCaseIds.has(c.id) && !refusedCaseIds.has(c.id),
    );
  }

  const activeCases = allCases.filter((c) => c.status !== "closed");

  // ── KPIs ───────────────────────────────────────────────────────
  const closedInWindow = allCases.filter(
    (c) => c.status === "closed" && c.closed_at && c.closed_at >= windowStartIso && c.closed_at <= windowEndIso,
  ).length;

  const collectedInWindow = allPayments
    .filter((p) => isPaymentVerified(p) && p.received_date >= windowStartDate && p.received_date <= windowEndDate)
    .reduce((sum, p) => sum + (p.is_refund ? -1 : 1) * Number(p.amount_cad), 0);

  const collectedByCase = new Map<string, number>();
  for (const p of allPayments) {
    if (!p.case_id || !isPaymentVerified(p)) continue;
    collectedByCase.set(p.case_id, (collectedByCase.get(p.case_id) ?? 0) + (p.is_refund ? -1 : 1) * Number(p.amount_cad));
  }

  const activeCaseIds = activeCases.map((c) => c.id);
  const { data: activeRetainers } = activeCaseIds.length
    ? await supabase.schema("crm").from("retainer_agreements").select("case_id, government_fee_cad, hst_cad").in("case_id", activeCaseIds).is("voided_at", null).is("deleted_at", null).not("signed_at", "is", null)
    : { data: [] as never[] };
  const retainerByCase = new Map<string, { government_fee_cad: number | null; hst_cad: number | null }>();
  for (const r of activeRetainers ?? []) {
    if (r.case_id) retainerByCase.set(r.case_id, { government_fee_cad: r.government_fee_cad, hst_cad: r.hst_cad });
  }

  const outstandingTotal = activeCases.reduce((sum, c) => {
    return sum + computeCaseOutstanding(c, retainerByCase.get(c.id) ?? null, collectedByCase.get(c.id) ?? 0);
  }, 0);

  const approvedCount = approvedEventCount;
  const refusedCount = refusedEventCount;
  const submittedTotal = allCases.filter((c) => c.submitted_at !== null).length;
  const approvalRate = submittedTotal > 0
    ? Math.round((approvedCount / submittedTotal) * 100)
    : null;

  // ── Cases needing attention ────────────────────────────────────
  type AttentionItem = { caseId: string; caseNumber: string; reason: string; severity: "high" | "medium"; days: number };
  const attentionItems: AttentionItem[] = [];

  for (const c of activeCases) {
    const age = daysAgo(c.created_at);
    const phase = phaseIndex(c.status);

    // Stuck in retainer phase > 14 days
    if (c.status === "retainer_pending" && age > 14) {
      attentionItems.push({ caseId: c.id, caseNumber: c.case_number, reason: "Retainer pending for " + age + " days", severity: "high", days: age });
    }
    // Stuck in documents > 30 days
    if (c.status === "documentation_in_progress" && age > 30) {
      attentionItems.push({ caseId: c.id, caseNumber: c.case_number, reason: "Collecting documents for " + age + " days", severity: "medium", days: age });
    }
    // Submitted to IRCC > 180 days with no decision
    if (c.status === "submitted_to_ircc" && c.submitted_at) {
      const waitDays = daysAgo(c.submitted_at);
      if (waitDays > 180) {
        attentionItems.push({ caseId: c.id, caseNumber: c.case_number, reason: "Waiting on IRCC for " + waitDays + " days", severity: "medium", days: waitDays });
      }
    }
    // Outstanding payment > quoted * 0.5 and case open > 30 days
    const collected = collectedByCase.get(c.id) ?? 0;
    const quoted = Number(c.quoted_fee_cad ?? 0);
    if (quoted > 0 && collected < quoted * 0.5 && age > 30) {
      attentionItems.push({ caseId: c.id, caseNumber: c.case_number, reason: "Under 50% paid (" + fmtCad(collected) + " of " + fmtCad(quoted) + ")", severity: "high", days: age });
    }
  }
  attentionItems.sort((a, b) => b.days - a.days);

  // ── Pipeline / phase counts ────────────────────────────────────
  const phaseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of activeCases) {
    const idx = phaseIndex(c.status);
    if (idx !== null) phaseCounts[idx] = (phaseCounts[idx] ?? 0) + 1;
  }
  const phaseMax = Math.max(1, ...Object.values(phaseCounts));

  // ── Revenue intelligence ───────────────────────────────────────
  const totalQuoted = activeCases.reduce((s, c) => s + Number(c.quoted_fee_cad ?? 0), 0);
  const totalCollected = Array.from(collectedByCase.values()).reduce((s, v) => s + v, 0);

  // Aging: payments overdue by bucket
  const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const c of activeCases) {
    const owed = computeCaseOutstanding(c, retainerByCase.get(c.id) ?? null, collectedByCase.get(c.id) ?? 0);
    if (owed <= 0) continue;
    const age = daysAgo(c.created_at);
    if (age <= 30) aging.current += owed;
    else if (age <= 60) aging.d30 += owed;
    else if (age <= 90) aging.d60 += owed;
    else aging.d90 += owed;
  }

  // Revenue by month
  const monthBuckets: { key: string; label: string; revenue: number }[] = [];
  const monthCount = Math.max(1, Math.min(24,
    (revenueEnd.getUTCFullYear() - revenueStart.getUTCFullYear()) * 12 +
    (revenueEnd.getUTCMonth() - revenueStart.getUTCMonth()) + 1,
  ));
  for (let i = 0; i < monthCount; i++) {
    const d = new Date(Date.UTC(revenueStart.getUTCFullYear(), revenueStart.getUTCMonth() + i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthBuckets.push({ key, label: MONTH_LABEL.format(d), revenue: 0 });
  }
  const monthIndex = new Map(monthBuckets.map((m, i) => [m.key, i]));
  for (const p of allPayments) {
    if (!isPaymentVerified(p)) continue;
    const idx = monthIndex.get(p.received_date.slice(0, 7));
    if (idx !== undefined) monthBuckets[idx].revenue += (p.is_refund ? -1 : 1) * Number(p.amount_cad);
  }
  const revenueMax = Math.max(1, ...monthBuckets.map((m) => m.revenue));

  // ── Conversion funnel ──────────────────────────────────────────
  const totalCasesEver = allCases.length;
  const submittedCount = allCases.filter((c) => c.submitted_at !== null).length;
  const decidedCount = approvedCount + refusedCount;

  // Average days per phase (from created_at → submitted_at → decided_at)
  const prepDays: number[] = [];
  const irccDays: number[] = [];
  for (const c of allCases) {
    if (c.submitted_at) {
      prepDays.push(Math.floor((new Date(c.submitted_at).getTime() - new Date(c.created_at).getTime()) / 86400000));
    }
    if (c.submitted_at && c.decided_at) {
      irccDays.push(Math.floor((new Date(c.decided_at).getTime() - new Date(c.submitted_at).getTime()) / 86400000));
    }
  }
  const avgPrepDays = prepDays.length > 0 ? Math.round(prepDays.reduce((a, b) => a + b, 0) / prepDays.length) : null;
  const avgIrccDays = irccDays.length > 0 ? Math.round(irccDays.reduce((a, b) => a + b, 0) / irccDays.length) : null;

  // ── Client acquisition ─────────────────────────────────────────
  const clientsInWindow = allClients.filter(
    (c) => c.created_at >= windowStartIso && c.created_at <= windowEndIso,
  );
  const newClientsCount = clientsInWindow.length;
  const clientsBySource = new Map<string, number>();
  for (const c of clientsInWindow) {
    const src = c.source ?? "unknown";
    clientsBySource.set(src, (clientsBySource.get(src) ?? 0) + 1);
  }
  const sourceRows = Array.from(clientsBySource.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const leadsCount = allClients.filter((c) => c.status === "lead").length;
  // Clients not in "lead" or "dormant" are considered retained/active
  const retainedCount = allClients.filter((c) => c.status !== "lead" && c.status !== "dormant" && c.status !== "closed").length;
  const conversionRate = leadsCount + retainedCount > 0
    ? Math.round((retainedCount / (leadsCount + retainedCount)) * 100)
    : null;

  // ── RCIC workload ──────────────────────────────────────────────
  const rcicCounts = new Map<string, number>();
  for (const c of activeCases) rcicCounts.set(c.assigned_rcic, (rcicCounts.get(c.assigned_rcic) ?? 0) + 1);
  const rcicRows = Array.from(rcicCounts.entries())
    .map(([id, count]) => ({ id, name: staffById.get(id)?.name ?? "Unassigned", count }))
    .sort((a, b) => b.count - a.count);
  const rcicMax = Math.max(1, ...rcicRows.map((r) => r.count));

  // ── Filter options ─────────────────────────────────────────────
  const serviceTypeOptions = (serviceTypes ?? []).map((s) => ({ id: s.id, name: s.name }));
  const rcicOptions = (staff ?? [])
    .filter((s) => s.role === "rcic" || s.role === "admin" || s.role === "super_user")
    .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }));

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Reports</h1>
        <p className="mt-1 text-sm text-stone-500">
          Pipeline, revenue, workload, and client acquisition.
        </p>
      </div>

      <ReportsFilters
        serviceTypeId={serviceTypeId}
        rcicId={rcicId}
        staffId={staffId}
        statusFilter={statusFilter}
        phaseFilter={phaseFilter !== null ? String(phaseFilter) : null}
        decisionFilter={decisionFilter}
        from={fromDate}
        to={toDate}
        serviceTypeOptions={serviceTypeOptions}
        rcicOptions={rcicOptions}
        staffOptions={(staff ?? []).map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }))}
      />

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-px overflow-hidden border border-stone-200 bg-stone-200 lg:grid-cols-5">
        <Kpi label="Active cases" value={fmtInt(activeCases.length)} />
        <Kpi label={`Closed (${windowLabel})`} value={fmtInt(closedInWindow)} />
        <Kpi label={`Collected (${windowLabel})`} value={fmtCad(collectedInWindow)} />
        <Kpi label="Outstanding" value={fmtCad(outstandingTotal)} />
        <Kpi
          label="Approval rate"
          value={approvalRate !== null ? `${approvalRate}%` : "N/A"}
          hint={approvedCount + refusedCount > 0 ? `${approvedCount} approved, ${refusedCount} refused` : undefined}
        />
      </div>

      {/* ── Cases needing attention ─────────────────────────── */}
      {attentionItems.length > 0 && (
        <Section title="Cases needing attention" subtitle={`${attentionItems.length} cases require follow-up`}>
          <div className="divide-y divide-stone-100">
            {attentionItems.slice(0, 10).map((item) => (
              <div key={item.caseId + item.reason} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 ${item.severity === "high" ? "bg-[var(--destructive)]" : "bg-amber-500"}`} />
                  <Link href={`/dashboard/cases/${item.caseId}`} className="font-mono text-xs text-[var(--navy)] hover:underline">
                    {item.caseNumber}
                  </Link>
                  <span className="text-sm text-stone-600">{item.reason}</span>
                </div>
              </div>
            ))}
          </div>
          {attentionItems.length > 10 && (
            <p className="mt-2 text-xs text-stone-400">
              Showing 10 of {attentionItems.length}. Resolve the most urgent first.
            </p>
          )}
        </Section>
      )}

      {/* ── Conversion funnel ───────────────────────────────── */}
      <Section title="Conversion funnel" subtitle="How cases progress from intake to decision">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <FunnelStep label="Total cases" value={fmtInt(totalCasesEver)} pct={100} />
          <FunnelStep label="Submitted to IRCC" value={fmtInt(submittedCount)} pct={totalCasesEver > 0 ? (submittedCount / totalCasesEver) * 100 : 0} />
          <FunnelStep label="Decision received" value={fmtInt(decidedCount)} pct={totalCasesEver > 0 ? (decidedCount / totalCasesEver) * 100 : 0} />
          <FunnelStep label="Approved" value={fmtInt(approvedCount)} pct={totalCasesEver > 0 ? (approvedCount / totalCasesEver) * 100 : 0} color="bg-emerald-600" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Avg. days to submission" value={avgPrepDays !== null ? `${avgPrepDays}d` : "N/A"} />
          <Stat label="Avg. IRCC processing" value={avgIrccDays !== null ? `${avgIrccDays}d` : "N/A"} />
          <Stat label="Refused" value={fmtInt(refusedCount)} />
          <Stat label="Approval rate" value={approvalRate !== null ? `${approvalRate}%` : "N/A"} />
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Pipeline ─────────────────────────────────────── */}
        <Section title="Active pipeline" subtitle="Cases by current phase">
          <ul className="space-y-2">
            {[1, 2, 3, 4, 5].map((idx) => {
              const count = phaseCounts[idx] ?? 0;
              const pct = (count / phaseMax) * 100;
              return (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-stone-600">{PHASE_LABELS[idx]}</span>
                  <div className="relative h-6 flex-1 overflow-hidden bg-stone-100">
                    <div className="absolute inset-y-0 left-0 bg-[var(--navy)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium tabular-nums text-stone-700">{fmtInt(count)}</span>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ── Revenue intelligence ─────────────────────────── */}
        <Section title="Revenue" subtitle="Quoted vs collected across active cases">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-600">Quoted (active)</span>
              <span className="text-sm font-medium tabular-nums text-stone-800">{fmtCad(totalQuoted)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-600">Collected (verified)</span>
              <span className="text-sm font-medium tabular-nums text-emerald-700">{fmtCad(totalCollected)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-600">Outstanding</span>
              <span className="text-sm font-medium tabular-nums text-amber-700">{fmtCad(outstandingTotal)}</span>
            </div>
            <div className="border-t border-stone-100 pt-3">
              <div className="text-xs font-medium text-stone-500">Aging receivables</div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                <AgingCell label="Current" value={fmtCad(aging.current)} />
                <AgingCell label="30+ days" value={fmtCad(aging.d30)} />
                <AgingCell label="60+ days" value={fmtCad(aging.d60)} warn />
                <AgingCell label="90+ days" value={fmtCad(aging.d90)} warn />
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Revenue by month ────────────────────────────────── */}
      <Section
        title="Revenue by month"
        subtitle={fromDate || toDate ? "Verified payments in selected range" : "Verified payments over the last 12 months"}
      >
        <div className="flex h-48 items-end gap-2">
          {monthBuckets.map((m) => {
            const pct = revenueMax > 0 ? (m.revenue / revenueMax) * 100 : 0;
            return (
              <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <div className="mb-1 text-[10px] font-medium tabular-nums text-stone-600">
                  {m.revenue > 0 ? fmtCad(m.revenue) : ""}
                </div>
                <div className="w-full bg-emerald-600" style={{ height: `${Math.max(pct, 0)}%` }} title={`${m.label}: ${fmtCad(m.revenue)}`} />
                <div className="mt-1 text-[10px] text-stone-500">{m.label}</div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Client acquisition ────────────────────────────── */}
        <Section title={`Client acquisition (${windowLabel})`} subtitle="New clients and their sources">
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="New clients" value={fmtInt(newClientsCount)} />
            <Stat label="Total leads" value={fmtInt(leadsCount)} />
            <Stat label="Lead to retained" value={conversionRate !== null ? `${conversionRate}%` : "N/A"} />
          </div>
          {sourceRows.length > 0 && (
            <div className="mt-4 border-t border-stone-100 pt-3">
              <div className="text-xs font-medium text-stone-500">By source</div>
              <ul className="mt-2 space-y-1">
                {sourceRows.map((r) => (
                  <li key={r.source} className="flex items-center justify-between text-sm">
                    <span className="text-stone-600 capitalize">{r.source.replace(/_/g, " ")}</span>
                    <span className="font-medium tabular-nums text-stone-800">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>

        {/* ── RCIC workload ─────────────────────────────────── */}
        <Section title="RCIC workload" subtitle="Active cases per assigned consultant">
          {rcicRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-stone-400">No active cases assigned.</p>
          ) : (
            <ul className="space-y-2">
              {rcicRows.map((row) => {
                const pct = (row.count / rcicMax) * 100;
                return (
                  <li key={row.id} className="flex items-center gap-3 text-sm">
                    <span className="w-36 shrink-0 truncate text-stone-600" title={row.name}>{row.name}</span>
                    <div className="relative h-6 flex-1 overflow-hidden bg-stone-100">
                      <div className="absolute inset-y-0 left-0 bg-[var(--navy-400)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right font-medium tabular-nums text-stone-700">{fmtInt(row.count)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-stone-400">{hint}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-stone-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-stone-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 px-3 py-2.5">
      <div className="text-[11px] text-stone-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-stone-800">{value}</div>
    </div>
  );
}

function FunnelStep({ label, value, pct, color }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums text-stone-900">{value}</div>
      <div className="mt-1 h-1.5 w-full overflow-hidden bg-stone-100">
        <div className={color ?? "bg-[var(--navy)]"} style={{ width: `${Math.max(pct, 0)}%`, height: "100%" }} />
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-stone-400">{Math.round(pct)}%</div>
    </div>
  );
}

function AgingCell({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`px-2 py-2 ${warn ? "bg-amber-50" : "bg-stone-50"}`}>
      <div className="text-[10px] text-stone-500">{label}</div>
      <div className={`mt-0.5 text-sm font-medium tabular-nums ${warn ? "text-amber-700" : "text-stone-700"}`}>{value}</div>
    </div>
  );
}
