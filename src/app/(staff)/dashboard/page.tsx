import Link from "next/link";
import { redirect } from "next/navigation";

import { AttentionList } from "@/components/dashboard/AttentionList";
import { CaseloadArea, PipelineBars, ServiceDonut } from "@/components/dashboard/charts-lazy";
import { NextTwoWeeks } from "@/components/dashboard/copilot-cards";
import { Callout, KpiCards, Panel, PanelLink, RecentTable } from "@/components/dashboard/overview-cards";
import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { NewAppointmentDialog } from "./appointments/_components/new-appointment-dialog";
import { loadNewAppointmentDialogData } from "./appointments/new-appointment-data";
import { getStaff } from "@/lib/auth/staff";
import { loadActiveBoardCards, type EnrichedCard } from "@/lib/dashboard/boardCards";
import { getAttention, sortAttention } from "@/lib/dashboard/getAttention";
import { getKpis } from "@/lib/dashboard/getKpis";
import { getMyTasks } from "@/lib/dashboard/getMyTasks";
import { getPipeline } from "@/lib/dashboard/getPipeline";
import { getRecentActivity } from "@/lib/dashboard/getRecentActivity";
import { getSnapshotSeries } from "@/lib/dashboard/getSnapshotSeries";
import { getUpcomingAppointments } from "@/lib/dashboard/getUpcomingAppointments";
import type {
  DashboardTask,
  RecentRow,
} from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";

import type { AppointmentRow } from "./appointments/_components/types";

// Server-rendered home for the signed-in person. It opens on what is waiting
// on them, then the slice of the work that fits their role (own caseload for
// a consultant, the calendar for reception, the firm's numbers for whoever
// runs it), then the firm-wide picture. Every panel reads finished view models
// from lib/dashboard; the only client island is the radar's toggle.
export const dynamic = "force-dynamic";

// The firm operates out of Toronto, so the header's date and greeting follow
// that clock rather than the server's.
const FIRM_TZ = "America/Toronto";

function torontoHeader(): { date: string; greeting: string } {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", {
    timeZone: FIRM_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  // en-CA's 24-hour clock renders midnight as "24", so fold it back to 0.
  const hour =
    Number(
      now.toLocaleString("en-CA", { timeZone: FIRM_TZ, hour: "2-digit", hour12: false }),
    ) % 24;
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return { date, greeting };
}

export default async function DashboardPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  const canCases = staffCan(me, "view_cases");
  const canFinancials = staffCan(me, "view_financials");
  const canTasks = staffCan(me, "view_tasks");
  const canAppointments = staffCan(me, "manage_appointments");
  const canCreateCases = staffCan(me, "create_cases");
  const canCreateClients = staffCan(me, "create_clients");

  const supabase = await createClient();

  const [attention, kpis, cards, recent, tasks, appointments, history, tenant] = await Promise.all([
    getAttention(supabase, me),
    getKpis(supabase),
    canCases ? loadActiveBoardCards(supabase) : Promise.resolve([] as EnrichedCard[]),
    canCases ? getRecentActivity(supabase) : Promise.resolve([] as RecentRow[]),
    canTasks ? getMyTasks(supabase, me.id) : Promise.resolve([] as DashboardTask[]),
    canAppointments
      ? getUpcomingAppointments(supabase)
      : Promise.resolve([] as AppointmentRow[]),
    canCases ? getSnapshotSeries(supabase) : Promise.resolve([]),
    supabase.schema("crm").from("tenants").select("name").maybeSingle().then((r) => r.data?.name ?? null),
  ]);

  const pipeline = getPipeline(cards);

  // A consultant or paralegal opens on their own files; everyone else on the
  // firm's. The firm-wide strip still follows for anyone who can see cases.
  const isOwnWorkRole = me.role === "rcic" || me.role === "paralegal" || me.role === "staff";
  const myCards = cards.filter((c) => c.rcicId === me.id || c.card.workerId === me.id);
  const myPipeline = isOwnWorkRole && myCards.length > 0 ? getPipeline(myCards) : null;

  // Only load the appointment dialog's data when the button will render.
  const apptDialogData = canAppointments
    ? await loadNewAppointmentDialogData()
    : null;

  // Two queues come from the board model rather than the loader: cases where
  // the next move is the firm's, and permits about to expire.
  const scope = myPipeline ? myCards : cards;
  const onUs = scope.filter((c) => c.card.ballInCourt === "firm");
  const expiring = scope
    .filter((c) => c.daysUntilExpiry !== null && c.daysUntilExpiry <= 60)
    .sort((a, b) => (a.daysUntilExpiry ?? 0) - (b.daysUntilExpiry ?? 0));
  const caseHref = (c: EnrichedCard) => `/dashboard/cases/${c.card.id}`;
  const queues = sortAttention([
    ...attention,
    ...(canCases && expiring.length > 0
      ? [{
          key: "expiring",
          count: expiring.length,
          noun: ["permit expiring within 60 days", "permits expiring within 60 days"] as [string, string],
          href: myPipeline ? `/dashboard/cases?view=board&assigned=${me.id}` : "/dashboard/cases?view=board",
          tone: (expiring.some((c) => (c.daysUntilExpiry ?? 99) <= 14) ? "critical" : "action") as "critical" | "action",
          items: expiring.slice(0, 3).map((c) => ({
            title: c.card.clientName,
            meta: `${c.card.caseNumber} · ${(c.daysUntilExpiry ?? 0) < 0 ? `expired ${-(c.daysUntilExpiry ?? 0)} days ago` : `expires in ${c.daysUntilExpiry} days`}`,
            href: caseHref(c),
          })),
        }]
      : []),
    ...(canCases && onUs.length > 0
      ? [{
          key: "on_us",
          count: onUs.length,
          noun: (myPipeline ? ["of your cases is waiting on you", "of your cases are waiting on you"] : ["case waiting on the firm", "cases waiting on the firm"]) as [string, string],
          href: myPipeline ? `/dashboard/cases?view=board&assigned=${me.id}` : "/dashboard/cases?view=board",
          tone: "action" as const,
          items: onUs
            .sort((a, b) => b.card.phaseAgeDays - a.card.phaseAgeDays)
            .slice(0, 3)
            .map((c) => ({
              title: c.card.clientName,
              meta: `${c.card.caseNumber} · ${c.card.statusText} · ${c.card.phaseAgeDays} days in phase`,
              href: caseHref(c),
            })),
        }]
      : []),
  ]);

  // One line under the greeting that says what today looks like.
  const glance = queues.slice(0, 4).map((q) => `${q.count} ${q.count === 1 ? q.noun[0] : q.noun[1]}`);

  const { date, greeting } = torontoHeader();

  const boardHref = myPipeline ? `/dashboard/cases?view=board&assigned=${me.id}` : "/dashboard/cases?view=board";
  const shownPipeline = myPipeline ?? pipeline;
  const kpiViews = kpis
    .filter((k) => k.key !== "outstanding_fees" || canFinancials)
    .map((k) => (k.key === "active_cases" && myPipeline ? { ...k, current: myCards.length, previous: null, series: [] } : k));
  const kpiOverrides = {
    active_cases: { label: myPipeline ? "My active cases" : "Active cases", href: boardHref },
    clients: { href: "/dashboard/clients" },
    retained_mtd: { href: "/dashboard/cases" },
    outstanding_fees: { href: "/dashboard/payments" },
  };
  const byService = new Map<string, number>();
  for (const c of myPipeline ? myCards : cards) {
    const k = c.card.serviceName ?? "Unassigned";
    byService.set(k, (byService.get(k) ?? 0) + 1);
  }
  const serviceSlices = [...byService.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const waitingOnFirm = shownPipeline.reduce((n, p) => (p.withIrcc ? n : n + p.onUs), 0);
  const withIrcc = shownPipeline.filter((p) => p.withIrcc).reduce((n, p) => n + p.count, 0);

  return (
    <main className="space-y-5 px-6 pb-6 pt-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">Dashboard</h1>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {greeting}, {me.first_name}. Here&apos;s what&apos;s happening at {tenant ?? "the firm"} on {date}.
          </p>
        </div>
        {(canCreateClients || canAppointments) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {apptDialogData && (
              <NewAppointmentDialog
                types={apptDialogData.types}
                officeAddress={apptDialogData.officeAddress}
                rcicOptions={apptDialogData.rcicOptions}
                triggerLabel="+ New appointment"
                triggerVariant="outline"
              />
            )}
            {canCreateClients && (
              <Link href="/dashboard/clients/new" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                + New client
              </Link>
            )}
          </div>
        )}
      </div>

      {canCases && kpiViews.length > 0 && <KpiCards views={kpiViews} overrides={kpiOverrides} />}

      {canCases && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            title={myPipeline ? "My caseload over time" : "Caseload over time"}
            aside={
              <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-4 rounded-full bg-[var(--navy)]" /> Active cases</span>
                <span className="flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-4 rounded-full bg-[#C9CED6]" /> Clients</span>
              </div>
            }
          >
            <CaseloadArea points={history} />
          </Panel>
          <Panel title="Pipeline" aside={<PanelLink href={boardHref}>Board</PanelLink>}>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[12px] text-muted-foreground">Waiting on {myPipeline ? "you" : "the firm"}</div>
                <div className="text-[20px] font-semibold leading-none tabular-nums text-foreground">{waitingOnFirm}</div>
              </div>
              <div>
                <div className="text-[12px] text-muted-foreground">With IRCC</div>
                <div className="text-[20px] font-semibold leading-none tabular-nums text-foreground">{withIrcc}</div>
              </div>
            </div>
            <PipelineBars phases={shownPipeline} />
          </Panel>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {canCases ? <RecentTable rows={recent} /> : <AttentionList queues={queues} />}
        {canCases && <AttentionList queues={queues} />}
        {canCases && (
          <Panel title="Cases by service" aside={<PanelLink href="/dashboard/reports">Reports</PanelLink>}>
            <ServiceDonut slices={serviceSlices} centreLabel={serviceSlices[0]?.label ?? ""} />
          </Panel>
        )}
      </div>

      {(canAppointments || canTasks) && (
        <NextTwoWeeks appointments={canAppointments ? appointments : []} tasks={canTasks ? tasks : []} />
      )}

      <Callout queues={queues} />
    </main>
  );
}
