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
  const view = params.view ?? "calendar";
  const isCalendar = view === "calendar";

  const supabase = await createClient();

  // The calendar is a record of what happened as well as what is coming, so it
  // reaches back into the past and shows every status by default. The list view
  // stays a forward-looking, confirmed-only work queue.
  const PAST_HORIZON_DAYS = 90;
  const nowMs = new Date().getTime();
  const fromDate =
    params.from ??
    (isCalendar
      ? new Date(nowMs - PAST_HORIZON_DAYS * 86400 * 1000).toISOString()
      : new Date(nowMs).toISOString());
  const toDate =
    params.to ??
    new Date(
      nowMs + (isCalendar ? 30 : DEFAULT_HORIZON_DAYS) * 86400 * 1000,
    ).toISOString();
  const statusFilter = params.status ?? (isCalendar ? "all" : "confirmed");

  let query = supabase
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
          id, given_names, family_name, email,
          address_line1, city, province_state, postal_code,
          date_of_birth, marital_status, background_responses
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
      statusFilter as
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
        | "pending_payment"
        | "awaiting_review",
    );
  }
  if (params.type) query = query.eq("appointment_type_id", params.type);
  if (params.staff) query = query.eq("assigned_staff_id", params.staff);

  const { data: appointmentRows } = await query;

  // APPT-8: denormalise the payment-proof SharePoint URL into the row so
  // the detail dialog can render a "View screenshot" link without a
  // cross-schema embed. Only fetched for awaiting_review rows since that
  // is the only state where staff actually needs to look at the proof.
  const screenshotIds = (appointmentRows ?? [])
    .filter((r) => r.status === "awaiting_review" && r.payment_screenshot_id)
    .map((r) => r.payment_screenshot_id as string);
  const screenshotUrlById = new Map<string, string>();
  if (screenshotIds.length > 0) {
    const { data: docs } = await supabase
      .schema("files")
      .from("documents")
      .select("id, sharepoint_web_url")
      .in("id", screenshotIds);
    for (const doc of docs ?? []) {
      if (doc.sharepoint_web_url) {
        screenshotUrlById.set(doc.id, doc.sharepoint_web_url);
      }
    }
  }
  const appointments = (
    (appointmentRows ?? []) as unknown as AppointmentRow[]
  ).map((row) => ({
    ...row,
    payment_screenshot_url: row.payment_screenshot_id
      ? (screenshotUrlById.get(row.payment_screenshot_id) ?? null)
      : null,
  }));

  // APPT-8: standing banner when there are payment proofs awaiting review.
  // We count regardless of the current filter so staff sees the work
  // queue even while browsing confirmed bookings.
  const { count: awaitingReviewCount } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("status", "awaiting_review")
    .is("deleted_at", null);

  const { data: typeRows } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, duration_minutes, requires_case, default_location_type, fee_cad",
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
    fee_cad: t.fee_cad,
  }));

  const { data: staffRows } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, first_name, last_name, is_rcic")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("first_name");
  const staffList: StaffOption[] = (staffRows ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));
  const rcicOptions = (staffRows ?? [])
    .filter((s) => s.is_rcic)
    .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }));

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
          rcicOptions={rcicOptions}
        />
      </header>

      {!!awaitingReviewCount && awaitingReviewCount > 0 && (
        <a
          href="/dashboard/appointments?status=awaiting_review"
          className="flex items-center justify-between gap-3 rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900 hover:bg-purple-100"
        >
          <span>
            <strong>
              {awaitingReviewCount} payment proof
              {awaitingReviewCount === 1 ? "" : "s"} awaiting your review
            </strong>
            <span className="ml-2 text-xs text-purple-700">
              Accept or reject from the appointment detail
            </span>
          </span>
          <span className="text-xs font-medium">Review now →</span>
        </a>
      )}

      <AppointmentFilters
        currentView={view}
        types={types as AppointmentTypeOption[]}
        staff={staffList}
        statusFilter={statusFilter}
        fromDate={fromDate}
        toDate={toDate}
      />

      {view === "calendar" ? (
        <AppointmentsCalendar
          appointments={appointments}
          staffList={staffList}
          nowIso={new Date(nowMs).toISOString()}
        />
      ) : (
        <AppointmentsList appointments={appointments} staffList={staffList} />
      )}
    </div>
  );
}
