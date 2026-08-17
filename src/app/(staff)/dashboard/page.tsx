import Link from "next/link";
import { redirect } from "next/navigation";

import { KpiCard } from "@/components/dashboard/KpiCard";
import { MyTasks } from "@/components/dashboard/MyTasks";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
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
import { getNeedsAttention } from "@/lib/dashboard/getNeedsAttention";
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

  const needs = getNeedsAttention(cards);
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

  return (
    <main className="space-y-6 px-6 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {me.first_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is how the firm is tracking right now.
          </p>
        </div>
        {(canCreateCases || canCreateClients || canAppointments) && (
          <div className="flex shrink-0 items-center gap-2">
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

      <section className="grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[1080px]:grid-cols-4">
        {visibleKpis.map((view) => (
          <KpiCard
            key={view.key}
            view={view}
            href={
              view.key === "active_cases" && canCases
                ? "/dashboard/cases"
                : undefined
            }
          />
        ))}
      </section>

      <div className="grid gap-6 min-[1080px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          {canCases && <NeedsAttention rows={needs} />}
          {canCases && <PipelineStrip phases={pipeline} />}
          {canCases && <RecentActivity rows={recent} />}
        </div>

        <div className="space-y-6">
          {canCases && <SuccessRadar data={radar} />}
          {canTasks && <MyTasks tasks={tasks} />}
          {canAppointments && (
            <UpcomingAppointmentsCard
              title="Upcoming"
              appointments={appointments}
              viewAllHref="/dashboard/appointments"
            />
          )}
        </div>
      </div>
    </main>
  );
}
