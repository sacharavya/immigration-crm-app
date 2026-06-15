import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { computeCaseOutstanding } from "@/lib/cases/fee-totals";
import { createClient } from "@/lib/supabase/server";
import { PHASE_LABELS, phaseIndex } from "@/lib/utils/phase";

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

type Props = {
  searchParams: Promise<{
    service_type?: string;
    rcic?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_reports")) {
    redirect("/dashboard?error=forbidden_view_reports");
  }

  const sp = await searchParams;
  const serviceTypeId = isUuid(sp.service_type) ? sp.service_type! : null;
  const rcicId = isUuid(sp.rcic) ? sp.rcic! : null;
  const fromDate = isIsoDate(sp.from) ? sp.from! : null;
  const toDate = isIsoDate(sp.to) ? sp.to! : null;

  const supabase = await createClient();
  const now = new Date();

  // KPI window — defaults to last 30 days when no explicit range.
  const defaultWindowStartIso = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const windowStartIso = fromDate
    ? `${fromDate}T00:00:00.000Z`
    : defaultWindowStartIso;
  const windowEndIso = toDate
    ? `${toDate}T23:59:59.999Z`
    : now.toISOString();
  const windowStartDate = windowStartIso.slice(0, 10);
  const windowEndDate = windowEndIso.slice(0, 10);
  const windowLabel = fromDate || toDate ? "in range" : "last 30d";

  // Revenue chart window — uses the explicit range when given, otherwise
  // the trailing 12 months. Caps at 24 months to keep the chart readable.
  const revenueStart = fromDate
    ? new Date(`${fromDate}T00:00:00.000Z`)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const revenueEnd = toDate
    ? new Date(`${toDate}T23:59:59.999Z`)
    : now;

  let casesQuery = supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, status, service_type_id, assigned_rcic, quoted_fee_cad, government_fee_cad, closed_at",
    )
    .is("deleted_at", null);
  if (serviceTypeId) casesQuery = casesQuery.eq("service_type_id", serviceTypeId);
  if (rcicId) casesQuery = casesQuery.eq("assigned_rcic", rcicId);

  const [
    { data: cases },
    { data: serviceTypes },
    { data: staff },
  ] = await Promise.all([
    casesQuery,
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, name")
      .is("deactivated_at", null)
      .order("name", { ascending: true }),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name, role")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
  ]);

  const allCases = cases ?? [];
  const caseIdSet = new Set(allCases.map((c) => c.id));
  const serviceNameById = new Map(
    (serviceTypes ?? []).map((s) => [s.id, s.name]),
  );
  const staffById = new Map(
    (staff ?? []).map((s) => [
      s.id,
      { name: `${s.first_name} ${s.last_name}`.trim(), role: s.role },
    ]),
  );

  // Payments are loaded for the broader revenue window, then filtered to
  // matching cases in JS. Service/RCIC filters narrow via case_id since
  // payments don't carry those columns directly.
  const { data: paymentsRaw } = await supabase
    .schema("crm")
    .from("payments")
    .select("amount_cad, is_refund, received_date, case_id, proof_document_id")
    .is("deleted_at", null)
    .gte("received_date", revenueStart.toISOString().slice(0, 10))
    .lte("received_date", revenueEnd.toISOString().slice(0, 10));

  const allPayments = (paymentsRaw ?? []).filter((p) =>
    serviceTypeId || rcicId
      ? p.case_id !== null && caseIdSet.has(p.case_id)
      : true,
  );

  const activeCases = allCases.filter((c) => c.status !== "closed");

  const closedInWindow = allCases.filter(
    (c) =>
      c.status === "closed" &&
      c.closed_at !== null &&
      c.closed_at >= windowStartIso &&
      c.closed_at <= windowEndIso,
  ).length;

  const collectedInWindow = allPayments
    .filter(
      (p) =>
        p.received_date >= windowStartDate && p.received_date <= windowEndDate,
    )
    .reduce(
      (sum, p) => sum + (p.is_refund ? -1 : 1) * Number(p.amount_cad),
      0,
    );

  const collectedByCase = new Map<string, number>();
  for (const p of allPayments) {
    if (!p.case_id) continue;
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id,
      (collectedByCase.get(p.case_id) ?? 0) + sign * Number(p.amount_cad),
    );
  }
  // Pull signed-retainer snapshots for every active case so the
  // outstanding total includes government fee + HST, not just the
  // service fee. Done after the filter so we don't fetch retainers
  // for closed cases.
  const activeCaseIds = activeCases.map((c) => c.id);
  const { data: activeRetainers } = activeCaseIds.length
    ? await supabase
        .schema("crm")
        .from("retainer_agreements")
        .select("case_id, government_fee_cad, hst_cad")
        .in("case_id", activeCaseIds)
        .is("voided_at", null)
        .is("deleted_at", null)
        .not("signed_at", "is", null)
    : { data: [] as never[] };
  const retainerByCase = new Map<
    string,
    { government_fee_cad: number | null; hst_cad: number | null }
  >();
  for (const r of activeRetainers ?? []) {
    if (r.case_id) {
      retainerByCase.set(r.case_id, {
        government_fee_cad: r.government_fee_cad,
        hst_cad: r.hst_cad,
      });
    }
  }

  const outstandingTotal = activeCases.reduce((sum, c) => {
    const collected = collectedByCase.get(c.id) ?? 0;
    return (
      sum +
      computeCaseOutstanding(c, retainerByCase.get(c.id) ?? null, collected)
    );
  }, 0);

  const paymentsWithoutProof = allPayments.filter(
    (p) => !p.proof_document_id && !p.is_refund,
  ).length;

  // ---- Cases by phase ----
  const phaseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of activeCases) {
    const idx = phaseIndex(c.status);
    if (idx !== null) phaseCounts[idx] = (phaseCounts[idx] ?? 0) + 1;
  }
  const phaseMax = Math.max(1, ...Object.values(phaseCounts));

  // ---- Cases by service type ----
  const serviceCounts = new Map<string, number>();
  for (const c of activeCases) {
    serviceCounts.set(
      c.service_type_id,
      (serviceCounts.get(c.service_type_id) ?? 0) + 1,
    );
  }
  const serviceRows = Array.from(serviceCounts.entries())
    .map(([id, count]) => ({
      id,
      name: serviceNameById.get(id) ?? "—",
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const serviceMax = Math.max(1, ...serviceRows.map((r) => r.count));

  // ---- Revenue by month ----
  const monthBuckets: { key: string; label: string; revenue: number }[] = [];
  const monthCount =
    (revenueEnd.getUTCFullYear() - revenueStart.getUTCFullYear()) * 12 +
    (revenueEnd.getUTCMonth() - revenueStart.getUTCMonth()) +
    1;
  const cappedMonthCount = Math.max(1, Math.min(24, monthCount));
  for (let i = 0; i < cappedMonthCount; i++) {
    const d = new Date(
      Date.UTC(
        revenueStart.getUTCFullYear(),
        revenueStart.getUTCMonth() + i,
        1,
      ),
    );
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthBuckets.push({
      key,
      label: MONTH_LABEL.format(d),
      revenue: 0,
    });
  }
  const monthIndex = new Map(monthBuckets.map((m, i) => [m.key, i]));
  for (const p of allPayments) {
    const key = p.received_date.slice(0, 7);
    const idx = monthIndex.get(key);
    if (idx === undefined) continue;
    const sign = p.is_refund ? -1 : 1;
    monthBuckets[idx].revenue += sign * Number(p.amount_cad);
  }
  const revenueMax = Math.max(1, ...monthBuckets.map((m) => m.revenue));

  // ---- RCIC workload ----
  const rcicCounts = new Map<string, number>();
  for (const c of activeCases) {
    rcicCounts.set(
      c.assigned_rcic,
      (rcicCounts.get(c.assigned_rcic) ?? 0) + 1,
    );
  }
  const rcicRows = Array.from(rcicCounts.entries())
    .map(([id, count]) => ({
      id,
      name: staffById.get(id)?.name ?? "Unassigned",
      role: staffById.get(id)?.role ?? null,
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const rcicMax = Math.max(1, ...rcicRows.map((r) => r.count));

  // ---- Filter dropdown options ----
  const serviceTypeOptions = (serviceTypes ?? []).map((s) => ({
    id: s.id,
    name: s.name,
  }));
  // Only RCIC-capable staff drive the workload chart, so scope the
  // dropdown to admin / rcic / super_user roles.
  const rcicOptions = (staff ?? [])
    .filter((s) => s.role === "rcic" || s.role === "admin" || s.role === "super_user")
    .map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
    }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          Reports
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          A live read of the firm&apos;s pipeline, revenue, and workload.
        </p>
      </div>

      <ReportsFilters
        serviceTypeId={serviceTypeId}
        rcicId={rcicId}
        from={fromDate}
        to={toDate}
        serviceTypeOptions={serviceTypeOptions}
        rcicOptions={rcicOptions}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Active cases"
          value={fmtInt(activeCases.length)}
          hint={`${fmtInt(allCases.length - activeCases.length)} closed in scope`}
        />
        <Kpi
          label={`Closed (${windowLabel})`}
          value={fmtInt(closedInWindow)}
          hint="Cases moved to Closed in window"
        />
        <Kpi
          label={`Collected (${windowLabel})`}
          value={fmtCad(collectedInWindow)}
          hint="Net of refunds"
        />
        <Kpi
          label="Outstanding"
          value={fmtCad(outstandingTotal)}
          hint={`${fmtInt(paymentsWithoutProof)} payments missing proof`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Cases by phase"
          subtitle="Active cases only — closed are excluded"
        >
          <ul className="space-y-2">
            {[1, 2, 3, 4, 5].map((idx) => {
              const count = phaseCounts[idx] ?? 0;
              const pct = (count / phaseMax) * 100;
              return (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-stone-600">
                    {PHASE_LABELS[idx]}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded bg-stone-100">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--navy)] to-[var(--navy-light)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium tabular-nums text-stone-700">
                    {fmtInt(count)}
                  </span>
                </li>
              );
            })}
          </ul>
        </ChartCard>

        <ChartCard
          title="Cases by service type"
          subtitle="Active cases grouped by immigration program"
        >
          {serviceRows.length === 0 ? (
            <Empty>No active cases.</Empty>
          ) : (
            <ul className="space-y-2">
              {serviceRows.map((row) => {
                const pct = (row.count / serviceMax) * 100;
                return (
                  <li key={row.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="w-40 shrink-0 truncate text-stone-600"
                      title={row.name}
                    >
                      {row.name}
                    </span>
                    <div className="relative h-6 flex-1 overflow-hidden rounded bg-stone-100">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--gold)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right font-medium tabular-nums text-stone-700">
                      {fmtInt(row.count)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Revenue by month"
        subtitle={
          fromDate || toDate
            ? "Net payments received in selected range"
            : "Net payments received over the last 12 months"
        }
      >
        <div className="flex h-48 items-end gap-2">
          {monthBuckets.map((m) => {
            const pct = revenueMax > 0 ? (m.revenue / revenueMax) * 100 : 0;
            const safePct = pct < 0 ? 0 : pct;
            return (
              <div
                key={m.key}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <div className="mb-1 text-[10px] font-medium text-stone-700 opacity-0 transition-opacity group-hover:opacity-100">
                  {fmtCad(m.revenue)}
                </div>
                <div
                  className="w-full rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400"
                  style={{ height: `${safePct}%` }}
                  title={`${m.label}: ${fmtCad(m.revenue)}`}
                />
                <div className="mt-1 text-[10px] text-stone-500">
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      <ChartCard
        title="RCIC workload"
        subtitle="Active cases per assigned RCIC"
      >
        {rcicRows.length === 0 ? (
          <Empty>No active cases assigned.</Empty>
        ) : (
          <ul className="space-y-2">
            {rcicRows.map((row) => {
              const pct = (row.count / rcicMax) * 100;
              return (
                <li key={row.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-40 shrink-0 truncate text-stone-600"
                    title={row.name}
                  >
                    {row.name}
                  </span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded bg-stone-100">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-medium tabular-nums text-stone-700">
                    {fmtInt(row.count)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </ChartCard>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-[var(--navy)]">
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--navy)]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-sm text-stone-500">{children}</p>
  );
}
