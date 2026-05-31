import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { AppointmentFilters } from "./_components/appointment-filters";
import { AppointmentsCalendar } from "./_components/appointments-calendar";
import { AppointmentsList } from "./_components/appointments-list";
import { NewAppointmentDialog } from "./_components/new-appointment-dialog";
import type {
  AppointmentRow,
  AppointmentTypeOption,
  LocationType,
  StaffOption,
} from "./_components/types";

export const dynamic = "force-dynamic";

const DEFAULT_HORIZON_DAYS = 14;

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: "list" | "calendar";
    status?: string;
    from?: string;
    to?: string;
    type?: string;
    staff?: string;
  }>;
}) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_appointments")) redirect("/dashboard");

  const params = await searchParams;
  const view = params.view ?? "list";

  const supabase = await createClient();

  const fromDate = params.from ?? new Date().toISOString();
  const toDate =
    params.to ??
    new Date(Date.now() + DEFAULT_HORIZON_DAYS * 86400 * 1000).toISOString();
  const statusFilter = params.status ?? "confirmed";

  let query = supabase
    .schema("crm")
    .from("appointments")
    .select(
      `
        id, starts_at, ends_at, timezone, location_type, online_link,
        onsite_address, status, reason, staff_notes, graph_sync_status,
        graph_sync_error, cancellation_reason, snapshot_client_name,
        snapshot_client_email, snapshot_client_phone,
        appointment_type:appointment_types!appointments_appointment_type_id_fkey(
          id, name, duration_minutes, default_location_type
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
    .is("deleted_at", null)
    .gte("starts_at", fromDate)
    .lte("starts_at", toDate)
    .order("starts_at", { ascending: true });

  if (statusFilter !== "all") {
    query = query.eq(
      "status",
      statusFilter as "confirmed" | "cancelled" | "completed" | "no_show",
    );
  }
  if (params.type) query = query.eq("appointment_type_id", params.type);
  if (params.staff) query = query.eq("assigned_staff_id", params.staff);

  const { data: appointmentRows } = await query;

  const appointments = (appointmentRows ?? []) as unknown as AppointmentRow[];

  const { data: typeRows } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, duration_minutes, requires_case, default_location_type",
    )
    .eq("active", true)
    .is("deleted_at", null)
    .order("display_order");
  const types = (typeRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    duration_minutes: t.duration_minutes,
    requires_case: t.requires_case,
    default_location_type: t.default_location_type as LocationType,
  }));

  const { data: staffRows } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, first_name, last_name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("first_name");
  const staffList: StaffOption[] = (staffRows ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));

  // Office address for the new appointment dialog default
  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select("office_address")
    .single();
  const officeAddress =
    settings?.office_address ??
    "211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5";

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">
            Appointments
          </h1>
          <p className="text-sm text-stone-500">
            Schedule consults, case reviews, and retainer signings. Plain
            calendar events sync to the firm&apos;s Outlook calendar.
          </p>
        </div>
        <NewAppointmentDialog
          types={types as AppointmentTypeOption[]}
          officeAddress={officeAddress}
        />
      </header>

      <AppointmentFilters
        currentView={view}
        types={types as AppointmentTypeOption[]}
        staff={staffList}
        statusFilter={statusFilter}
        fromDate={fromDate}
        toDate={toDate}
      />

      {view === "calendar" ? (
        <AppointmentsCalendar />
      ) : (
        <AppointmentsList appointments={appointments} />
      )}
    </div>
  );
}
