import {
  ArrowRight,
  Briefcase,
  CheckSquare,
  DollarSign,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  chipInputFromViewRow,
  computeActionChip,
  type ChipOutput,
} from "@/lib/cases/action-chip";
import { computeCaseOutstanding } from "@/lib/cases/fee-totals";
import { isPaymentVerified } from "@/lib/payments/verified";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";
import {
  PHASE_LABELS,
  STATUS_LABEL,
  phaseIndex,
  type CaseStatus,
} from "@/lib/utils/phase";

import type { AppointmentRow } from "./appointments/_components/types";
import { UpcomingAppointmentsCard } from "./appointments/_components/upcoming-appointments-card";

const PHASES = [1, 2, 3, 4, 5] as const;

const statusPill: Record<CaseStatus, string> = {
  retainer_pending: "bg-gray-200 text-gray-700",
  documentation_in_progress: "bg-blue-100 text-blue-800",
  documentation_review: "bg-blue-100 text-blue-800",
  submitted_to_ircc: "bg-amber-100 text-amber-800",
  passport_requested: "bg-green-100 text-green-800",
  refused: "bg-red-100 text-red-800",
  closed: "bg-gray-200 text-gray-700",
};

const ACTIVE_TASK_STATUSES = ["open", "in_progress", "blocked"] as const;

type MyTask = {
  id: string;
  title: string;
  status: "open" | "in_progress" | "blocked" | "done" | "cancelled";
  priority: string | null;
  due_at: string | null;
  due_date: string | null;
  case_id: string | null;
  case: { case_number: string } | null;
};

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function formatCAD(amount: number): string {
  return amount.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function dueLabel(t: MyTask): { label: string; tone: "overdue" | "today" | "soon" | "later" | "none" } {
  const iso = t.due_at ?? (t.due_date ? `${t.due_date}T00:00:00Z` : null);
  if (!iso) return { label: "No due date", tone: "none" };

  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 86_400_000;
  const dayDiff = Math.floor((due.getTime() - startOfToday.getTime()) / dayMs);

  if (dayDiff < 0) return { label: `Overdue · ${Math.abs(dayDiff)}d`, tone: "overdue" };
  if (dayDiff === 0) return { label: "Due today", tone: "today" };
  if (dayDiff === 1) return { label: "Due tomorrow", tone: "soon" };
  if (dayDiff <= 7) return { label: `In ${dayDiff}d`, tone: "soon" };
  return {
    label: due.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
    tone: "later",
  };
}

export default async function DashboardPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  const canCases = staffCan(me, "view_cases");
  const canClients = staffCan(me, "view_clients");
  const canFinancials = staffCan(me, "view_financials");
  const canTasks = staffCan(me, "view_tasks");
  const canCreateCases = staffCan(me, "create_cases");
  const canCreateClients = staffCan(me, "create_clients");
  const supabase = await createClient();

  const monthStart = startOfMonthISO();

  const [casesRes, clientCountRes, paymentsRes, tasksRes, chipRowsRes] =
    await Promise.all([
    canCases
      ? supabase
          .schema("crm")
          .from("cases")
          .select(
            `
              id,
              case_number,
              status,
              updated_at,
              retained_at,
              quoted_fee_cad,
              government_fee_cad,
              client:clients(legal_name_full)
            `,
          )
          .is("deleted_at", null)
          .neq("status", "closed")
          .order("updated_at", { ascending: false })
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            case_number: string;
            status: CaseStatus;
            updated_at: string;
            retained_at: string | null;
            quoted_fee_cad: number;
            government_fee_cad: number | null;
            client: { legal_name_full: string } | null;
          }>,
        }),
    canClients
      ? supabase
          .schema("crm")
          .from("clients")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
      : Promise.resolve({ count: 0 }),
    canFinancials
      ? supabase
          .schema("crm")
          .from("payments")
          .select(
            "case_id, amount_cad, is_refund, client_uploaded_at, verified_at",
          )
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
    canTasks
      ? supabase
          .schema("crm")
          .from("tasks")
          .select(
            `
              id,
              title,
              status,
              priority,
              due_at,
              due_date,
              case_id,
              case:cases(case_number)
            `,
          )
          .eq("assigned_to", me.id)
          .in("status", ACTIVE_TASK_STATUSES)
          .is("deleted_at", null)
          .order("due_at", { ascending: true, nullsFirst: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(10)
      : Promise.resolve({ data: [] as MyTask[] }),
    canCases
      ? supabase.schema("crm").from("v_case_chip_inputs").select("*")
      : Promise.resolve({ data: [] as Array<never> }),
  ]);

  const cases = casesRes.data ?? [];
  const clientCount = "count" in clientCountRes ? (clientCountRes.count ?? 0) : 0;
  const payments = paymentsRes.data ?? [];
  const tasks = (tasksRes.data ?? []) as MyTask[];

  // Pull the signed-retainer snapshot for each open case so the
  // outstanding KPI includes government fee + HST, not just the
  // service fee. One retainer per case via the unique constraint.
  const retainersByCase = new Map<
    string,
    { government_fee_cad: number | null; hst_cad: number | null }
  >();
  if (canFinancials && cases.length > 0) {
    const { data: retainers } = await supabase
      .schema("crm")
      .from("retainer_agreements")
      .select("case_id, government_fee_cad, hst_cad")
      .in(
        "case_id",
        cases.map((c) => c.id),
      )
      .is("voided_at", null)
      .is("deleted_at", null)
      .not("signed_at", "is", null);
    for (const r of retainers ?? []) {
      if (r.case_id) {
        retainersByCase.set(r.case_id, {
          government_fee_cad: r.government_fee_cad,
          hst_cad: r.hst_cad,
        });
      }
    }
  }

  // APPT-3 dashboard widget: next 5 confirmed appointments across the
  // firm. Only fetched when the staff can see appointments at all.
  const canAppointments = staffCan(me, "manage_appointments");
  const upcomingAppointments = canAppointments
    ? (
        await supabase
          .schema("crm")
          .from("appointments")
          .select(
            `
              id, starts_at, ends_at, timezone, location_type, online_link,
              onsite_address, teams_join_url, status, reason, staff_notes, graph_sync_status,
              fee_cad_at_booking, payment_uploaded_at, payment_screenshot_id,
              payment_reviewed_at, payment_rejection_reason, linked_payment_id,
              graph_sync_error, cancellation_reason, snapshot_client_name,
              snapshot_client_email, snapshot_client_phone,
              appointment_type:appointment_types!appointments_appointment_type_id_fkey(
                id, name, duration_minutes, default_location_type, preparation_notes
              ),
              client:clients!appointments_client_id_fkey(
                id, given_names, family_name, email
              ),
              case:cases!appointments_case_id_fkey(id, case_number),
              assigned_staff:staff!appointments_assigned_staff_id_fkey(
                id, first_name, last_name
              )
            `,
          )
          .eq("status", "confirmed")
          .is("deleted_at", null)
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(5)
      ).data ?? []
    : [];

  // Only VERIFIED payments contribute toward the firm-wide outstanding
  // KPI. Unverified client uploads sit in the pending bucket below.
  const collectedByCase = new Map<string, number>();
  for (const p of payments) {
    if (!p.case_id) continue;
    if (!isPaymentVerified(p)) continue;
    const sign = p.is_refund ? -1 : 1;
    collectedByCase.set(
      p.case_id,
      (collectedByCase.get(p.case_id) ?? 0) + sign * Number(p.amount_cad),
    );
  }
  const pendingVerificationFirmWide = payments.filter(
    (p) => p.client_uploaded_at !== null && p.verified_at === null,
  );

  const totalActive = cases.length;
  const newThisMonth = cases.filter(
    (c) => c.retained_at && c.retained_at >= monthStart,
  ).length;

  const phaseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const c of cases) {
    const p = phaseIndex(c.status);
    if (p !== null) phaseCounts[p] += 1;
  }

  // Aggregate chip responsibilities per phase for the dashboard pipeline
  // strip. Each phase shows "N waiting on client", "N action on us", or
  // "N overdue" depending on the mix. Aggregation is dashboard-only; the
  // per-case chip lives on the board/list views.
  const chipNow = new Date();
  type PhaseAgg = {
    us: number;
    client: number;
    ircc: number;
    overdue: number;
    sensitive: number;
  };
  const chipAggByPhase: Record<number, PhaseAgg> = {
    1: { us: 0, client: 0, ircc: 0, overdue: 0, sensitive: 0 },
    2: { us: 0, client: 0, ircc: 0, overdue: 0, sensitive: 0 },
    3: { us: 0, client: 0, ircc: 0, overdue: 0, sensitive: 0 },
    4: { us: 0, client: 0, ircc: 0, overdue: 0, sensitive: 0 },
    5: { us: 0, client: 0, ircc: 0, overdue: 0, sensitive: 0 },
  };
  for (const row of chipRowsRes.data ?? []) {
    if (!row.status) continue;
    const phase = phaseIndex(row.status);
    if (phase === null) continue;
    const input = chipInputFromViewRow(row, chipNow);
    if (!input) continue;
    const chip: ChipOutput = computeActionChip(input);
    const agg = chipAggByPhase[phase];
    if (chip.urgency === "overdue") agg.overdue += 1;
    else if (chip.urgency === "sensitive") agg.sensitive += 1;
    if (chip.responsibility === "us") agg.us += 1;
    else if (chip.responsibility === "client") agg.client += 1;
    else if (chip.responsibility === "ircc") agg.ircc += 1;
  }

  // Pick the most-pressing summary line per phase.
  function phaseSummary(agg: PhaseAgg): {
    text: string;
    tone: "overdue" | "sensitive" | "neutral";
  } | null {
    if (agg.overdue > 0) {
      return { text: `${agg.overdue} overdue`, tone: "overdue" };
    }
    if (agg.sensitive > 0) {
      return {
        text: `${agg.sensitive} need attention`,
        tone: "sensitive",
      };
    }
    if (agg.us > 0) {
      return { text: `${agg.us} action on us`, tone: "neutral" };
    }
    if (agg.client > 0) {
      return { text: `${agg.client} waiting on client`, tone: "neutral" };
    }
    if (agg.ircc > 0) {
      return { text: `${agg.ircc} waiting on IRCC`, tone: "neutral" };
    }
    return null;
  }

  let outstanding = 0;
  for (const c of cases) {
    const collected = collectedByCase.get(c.id) ?? 0;
    outstanding += computeCaseOutstanding(
      c,
      retainersByCase.get(c.id) ?? null,
      collected,
    );
  }

  const recent = cases.slice(0, 5);

  return (
    <main className="space-y-8 px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-stone-800">
            Welcome back, {me.first_name}
          </h1>
          <p className="text-sm text-stone-500">
            Here&apos;s how the firm is tracking right now.
          </p>
        </div>
        {(canCreateCases || canCreateClients) && (
          <div className="flex shrink-0 items-center gap-2">
            {canCreateClients && (
              <Link
                href="/dashboard/clients/new"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                + New client
              </Link>
            )}
            {canCreateCases && (
              <Link
                href="/dashboard/cases/new"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                + New case
              </Link>
            )}
          </div>
        )}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={<Briefcase className="h-4 w-4" />}
          label="Active cases"
          value={canCases ? totalActive.toString() : "—"}
          href={canCases ? "/dashboard/cases" : undefined}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Clients"
          value={canClients ? clientCount.toString() : "—"}
        />
        <KpiCard
          icon={<ArrowRight className="h-4 w-4" />}
          label="New this month"
          value={canCases ? newThisMonth.toString() : "—"}
          hint={canCases ? "Cases retained this calendar month" : undefined}
        />
        <CanServer staff={me} permission="view_financials">
          <KpiCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Outstanding fees"
            value={formatCAD(outstanding)}
            hint="Service + gov fee + HST minus collected, across active cases"
          />
        </CanServer>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          {canCases && (
            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-stone-700">
                    Pipeline
                  </h2>
                  <p className="text-xs text-stone-500">
                    Active cases by phase. Click to open the board.
                  </p>
                </div>
                <Link
                  href="/dashboard/cases?view=board"
                  className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
                >
                  Open board →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PHASES.map((phase) => {
                  const summary = phaseSummary(chipAggByPhase[phase]);
                  return (
                    <Link
                      key={phase}
                      href="/dashboard/cases?view=board"
                      className="group rounded-xl border border-stone-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
                          {phase}
                        </span>
                        <span className="text-xs font-medium text-stone-600">
                          {PHASE_LABELS[phase]}
                        </span>
                      </div>
                      <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-stone-900">
                        {phaseCounts[phase]}
                      </div>
                      {summary && (
                        <div
                          className={cn(
                            "mt-1 text-[10px] font-medium",
                            summary.tone === "overdue" && "text-red-700",
                            summary.tone === "sensitive" && "text-amber-700",
                            summary.tone === "neutral" && "text-stone-500",
                          )}
                        >
                          {summary.text}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {canCases && (
            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-stone-700">
                    Recently updated
                  </h2>
                  <p className="text-xs text-stone-500">
                    Most recent activity across active cases.
                  </p>
                </div>
                <Link
                  href="/dashboard/cases"
                  className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
                >
                  View all →
                </Link>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                {recent.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                    <p className="text-sm text-stone-500">No active cases yet.</p>
                    <CanServer staff={me} permission="create_cases">
                      <Link
                        href="/dashboard/cases/new"
                        className={`${buttonVariants({ variant: "outline" })} gap-1.5`}
                      >
                        + New case
                      </Link>
                    </CanServer>
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-100">
                    {recent.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/cases/${c.id}`}
                          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-stone-50"
                        >
                          <div className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
                            {c.case_number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-stone-900">
                              {c.client?.legal_name_full ?? "—"}
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              statusPill[c.status],
                              "shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                            )}
                          >
                            {STATUS_LABEL[c.status]}
                          </Badge>
                          <div className="hidden w-20 text-right text-xs tabular-nums text-stone-500 sm:block">
                            {timeAgo(c.updated_at)}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-4">
          {canTasks && <MyTasksPanel tasks={tasks} />}
          {canAppointments && (
            <UpcomingAppointmentsCard
              title="Upcoming appointments"
              appointments={upcomingAppointments as unknown as AppointmentRow[]}
              viewAllHref="/dashboard/appointments"
            />
          )}
        </div>
      </div>
    </main>
  );
}

function MyTasksPanel({ tasks }: { tasks: MyTask[] }) {
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <header className="flex items-center justify-between border-b border-stone-100 bg-stone-50/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-stone-500" />
            <h2 className="text-sm font-semibold tracking-tight text-stone-700">
              My tasks
            </h2>
          </div>
          <Badge className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-stone-600">
            {tasks.length}
          </Badge>
        </header>

        {tasks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-stone-500">Nothing on your plate.</p>
            <p className="mt-1 text-xs text-stone-400">
              Tasks assigned to you will show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {tasks.map((t) => {
              const due = dueLabel(t);
              const href = t.case_id ? `/dashboard/cases/${t.case_id}` : "#";
              return (
                <li key={t.id}>
                  <Link
                    href={href}
                    className="block px-4 py-3 transition-colors hover:bg-stone-50"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          t.priority === "high" || t.priority === "urgent"
                            ? "bg-red-500"
                            : t.status === "blocked"
                              ? "bg-amber-500"
                              : "bg-stone-300",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium leading-snug text-stone-900">
                          {t.title}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500">
                          {t.case?.case_number && (
                            <span className="font-mono uppercase tracking-wider text-stone-400">
                              {t.case.case_number}
                            </span>
                          )}
                          <span
                            className={cn(
                              "tabular-nums",
                              due.tone === "overdue" && "font-semibold text-red-600",
                              due.tone === "today" && "font-semibold text-amber-700",
                              due.tone === "soon" && "text-amber-700",
                              due.tone === "later" && "text-stone-500",
                              due.tone === "none" && "text-stone-400",
                            )}
                          >
                            {due.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="border-t border-stone-100 bg-stone-50/40 px-4 py-2.5 text-right">
          <Link
            href="/dashboard/tasks"
            className="text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline"
          >
            All tasks →
          </Link>
        </footer>
      </div>
    </aside>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
          {label}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500">
          {icon}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-stone-800">
        {value}
      </div>
      {hint && <p className="mt-1 line-clamp-2 text-[11px] text-stone-500">{hint}</p>}
    </>
  );

  const className =
    "rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all";

  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
}
