// The next few confirmed appointments across the firm. Shape matches the
// existing UpcomingAppointmentsCard.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppointmentRow } from "@/app/(staff)/dashboard/appointments/_components/types";
import type { Database } from "@/lib/supabase/types";

export async function getUpcomingAppointments(
  supabase: SupabaseClient<Database>,
  limit = 5,
): Promise<AppointmentRow[]> {
  const { data } = await supabase
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
    .limit(limit);

  return (data ?? []) as unknown as AppointmentRow[];
}
