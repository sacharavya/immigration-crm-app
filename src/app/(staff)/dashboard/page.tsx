import Link from "next/link";
import { redirect } from "next/navigation";

import { KpiBar } from "@/components/dashboard/KpiBar";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { PipelineStrip } from "@/components/dashboard/PipelineStrip";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SuccessRadar } from "@/components/dashboard/success-radar-lazy";
import { buttonVariants } from "@/components/ui/button";
import { staffCan } from "@/lib/auth/permissions";
import { NewAppointmentDialog } from "./appointments/_components/new-appointment-dialog";
import { loadNewAppointmentDialogData } from "./appointments/new-appointment-data";
import { getStaff } from "@/lib/auth/staff";
import { loadActiveBoardCards, type EnrichedCard } from "@/lib/dashboard/boardCards";
import { getKpis } from "@/lib/dashboard/getKpis";
import { getMyTasks } from "@/lib/dashboard/getMyTasks";
import { getPipeline } from "@/lib/dashboard/getPipeline";
import { getRecentActivity } from "@/lib/dashboard/getRecentActivity";
import { getSuccessRate } from "@/lib/dashboard/getSuccessRate";
import { getUpcomingAppointments } from "@/lib/dashboard/getUpcomingAppointments";
import type {
  DashboardTask,
  RadarData,
  RecentRow,
} from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";

import type { AppointmentRow } from "./appointments/_components/types";
import { UpcomingAppointmentsCard } from "./appointments/_components/upcoming-appointments-card";

// Server-rendered firm overview. Every panel reads finished view models from
// lib/dashboard; the only client island is the radar's Service/Category toggle.
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

  const [kpis, cards, radar, recent, tasks, appointments] = await Promise.all([
    getKpis(supabase),
    canCases ? loadActiveBoardCards(supabase) : Promise.resolve([] as EnrichedCard[]),
    canCases
      ? getSuccessRate(supabase)
      : Promise.resolve({ service: [], category: [] } as RadarData),
    canCases ? getRecentActivity(supabase) : Promise.resolve([] as RecentRow[]),
    canTasks ? getMyTasks(supabase, me.id) : Promise.resolve([] as DashboardTask[]),
    canAppointments
      ? getUpcomingAppointments(supabase)
      : Promise.resolve([] as AppointmentRow[]),
  ]);

  const pipeline = getPipeline(cards);

  // Outstanding fees is financial; hide that card from staff without the
  // permission. The other three are not sensitive.
  const visibleKpis = kpis.filter(
    (k) => k.key !== "outstanding_fees" || canFinancials,
  );

  // Only load the appointment dialog's data when the button will render.
  const apptDialogData = canAppointments
    ? await loadNewAppointmentDialogData()
    : null;

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

      <KpiBar
        views={visibleKpis}
        links={canCases ? { active_cases: "/dashboard/cases" } : undefined}
      />

      {canCases && <PipelineStrip phases={pipeline} />}

      <div className="grid gap-6 pt-1 min-[1080px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {canCases && <RecentActivity rows={recent} />}
          {canCases && <SuccessRadar data={radar} />}
        </div>

        <div className="space-y-6">
          {canAppointments && (
            <UpcomingAppointmentsCard
              title="Upcoming appointments"
              appointments={appointments}
              viewAllHref="/dashboard/appointments"
              prominent
            />
          )}
          {canTasks && <MyTasks tasks={tasks} />}
        </div>
      </div>
    </main>
  );
}
