import Link from "next/link";
import { redirect } from "next/navigation";

import { AttentionList } from "@/components/dashboard/AttentionList";
import { CaseloadCard, MoneyCard, NextTwoWeeks, PipelineRows } from "@/components/dashboard/copilot-cards";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
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
import { getUpcomingAppointments } from "@/lib/dashboard/getUpcomingAppointments";
import type {
  KpiView,
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

  const [attention, kpis, cards, recent, tasks, appointments] = await Promise.all([
    getAttention(supabase, me),
    getKpis(supabase),
    canCases ? loadActiveBoardCards(supabase) : Promise.resolve([] as EnrichedCard[]),
    canCases ? getRecentActivity(supabase) : Promise.resolve([] as RecentRow[]),
    canTasks ? getMyTasks(supabase, me.id) : Promise.resolve([] as DashboardTask[]),
    canAppointments
      ? getUpcomingAppointments(supabase)
      : Promise.resolve([] as AppointmentRow[]),
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

  const activeKpi = kpis.find((k) => k.key === "active_cases");
  const clientsKpi = kpis.find((k) => k.key === "clients");
  const retainedKpi = kpis.find((k) => k.key === "retained_mtd");
  const outstandingKpi = kpis.find((k) => k.key === "outstanding_fees");
  const boardHref = myPipeline ? `/dashboard/cases?view=board&assigned=${me.id}` : "/dashboard/cases?view=board";
  const shownPipeline = myPipeline ?? pipeline;
  const shownActive: KpiView | null = activeKpi
    ? myPipeline
      ? { ...activeKpi, current: myCards.length, previous: null, series: [] }
      : activeKpi
    : null;

  return (
    <main className="px-6 py-6">
      {/* Slim top row: where you are, what day it is, and the two or three things you create most. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] text-muted-foreground">{date}</p>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-foreground">
            {greeting}, {me.first_name}
          </h1>
        </div>
        {(canCreateCases || canCreateClients || canAppointments) && (
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
            {canCreateCases && (
              <Link href="/dashboard/cases/new" className={cn(buttonVariants({ size: "sm" }))}>
                + New case
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Two columns of panels. Left: what needs doing and how the work is
          moving; right: the figures, the money, the calendar. */}
      <div className="grid gap-4 min-[1080px]:grid-cols-2">
        <div className="flex flex-col gap-4">
          <AttentionList queues={queues} />
          {canCases && <PipelineRows phases={shownPipeline} href={boardHref} />}
          {canCases && <RecentActivity rows={recent} />}
        </div>
        <div className="flex flex-col gap-4">
          {canCases && shownActive && (
            <CaseloadCard
              active={shownActive}
              onUs={onUs.length}
              clients={clientsKpi?.current ?? 0}
              mine={Boolean(myPipeline)}
              href={boardHref}
            />
          )}
          {canFinancials && retainedKpi && outstandingKpi && (
            <MoneyCard retained={retainedKpi} outstanding={outstandingKpi} />
          )}
          {(canAppointments || canTasks) && (
            <NextTwoWeeks appointments={canAppointments ? appointments : []} tasks={canTasks ? tasks : []} />
          )}
        </div>
      </div>
    </main>
  );
}
