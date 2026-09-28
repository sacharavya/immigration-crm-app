import Link from "next/link";
import { redirect } from "next/navigation";

import { AttentionList } from "@/components/dashboard/AttentionList";
import { KpiBar } from "@/components/dashboard/KpiBar";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { PipelineStrip } from "@/components/dashboard/PipelineStrip";
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
  DashboardTask,
  RecentRow,
} from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";

import type { AppointmentRow } from "./appointments/_components/types";
import { UpcomingAppointmentsCard } from "./appointments/_components/upcoming-appointments-card";

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
  // Front desk lives by the calendar; the firm's numbers matter to whoever runs it.
  const calendarFirst = me.role === "reception";
  const showKpis = !isOwnWorkRole && me.role !== "reception" && me.role !== "document_officer";

  // Outstanding fees is financial; hide that card from staff without the
  // permission. The other three are not sensitive.
  const visibleKpis = kpis.filter(
    (k) => k.key !== "outstanding_fees" || canFinancials,
  );

  // Only load the appointment dialog's data when the button will render.
  const apptDialogData = canAppointments
    ? await loadNewAppointmentDialogData()
    : null;

  // Cases where the next move is the firm's come from the board model, so
  // they join the attention list here rather than in the loader.
  const scope = myPipeline ? myCards : cards;
  const onUs = scope.filter((c) => c.card.ballInCourt === "firm").length;
  const attentionItems = sortAttention(
    canCases && onUs > 0
      ? [
          ...attention,
          {
            key: "on_us",
            count: onUs,
            noun: myPipeline ? ["of your cases is waiting on you", "of your cases are waiting on you"] : ["case waiting on the firm", "cases waiting on the firm"],
            href: myPipeline ? `/dashboard/cases?view=board&assigned=${me.id}` : "/dashboard/cases?view=board",
            tone: "action" as const,
          },
        ]
      : attention,
  );

  const { date, greeting } = torontoHeader();

  return (
    <main className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--subtle-foreground)]">
            {date}
          </p>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
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
              <Link
                href="/dashboard/clients/new"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
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

      {/* Row 1: what is waiting on you, beside the queue your day runs on. */}
      <div className="grid gap-6 min-[1080px]:grid-cols-[minmax(0,1fr)_340px]">
        <AttentionList items={attentionItems} />
        {calendarFirst && canAppointments ? (
          <UpcomingAppointmentsCard
            title="Today and next"
            appointments={appointments}
            viewAllHref="/dashboard/appointments"
            prominent
          />
        ) : canTasks ? (
          <MyTasks tasks={tasks} />
        ) : null}
      </div>

      {/* Row 2: your own files, or the firm's numbers, depending on the role. */}
      {myPipeline && (
        <PipelineStrip phases={myPipeline} title="My caseload" boardHref={`/dashboard/cases?view=board&assigned=${me.id}`} />
      )}
      {showKpis && (
        <KpiBar
          views={visibleKpis}
          links={canCases ? { active_cases: "/dashboard/cases" } : undefined}
        />
      )}
      {canCases && <PipelineStrip phases={pipeline} title={myPipeline ? "Firm pipeline" : "Pipeline"} />}

      {/* Row 3: activity and outcomes, with whatever queue row 1 did not take. */}
      <div className="grid gap-6 pt-1 min-[1080px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {canCases && <RecentActivity rows={recent} />}
        </div>

        <div className="space-y-6">
          {!calendarFirst && canAppointments && (
            <UpcomingAppointmentsCard
              title="Upcoming appointments"
              appointments={appointments}
              viewAllHref="/dashboard/appointments"
              prominent
            />
          )}
          {calendarFirst && canTasks && <MyTasks tasks={tasks} />}
          {!showKpis && (
            <KpiBar
              views={visibleKpis.filter((k) => k.key !== "outstanding_fees")}
              links={canCases ? { active_cases: "/dashboard/cases" } : undefined}
            />
          )}
        </div>
      </div>
    </main>
  );
}
