import { adminClient } from "@/lib/supabase/admin";

import { getBusyIntervals } from "@/lib/graph/calendar";

import { generateOpenSlots, type HoursByWeekday, type Slot } from "./slots";

// Combines CRM busy (confirmed appointments) with Graph busy (external
// blocks on the info@ calendar) and runs the pure slot generator. Reads
// fresh every call — no caching, which would risk double-bookings. Runs
// without a user session (booking page / slot API), so it uses a
// service-role client, matching the inline pattern used elsewhere in the
// app (no shared factory exists). crm tables need an explicit .schema("crm")
// because PostgREST defaults to the public schema.


export async function getOpenSlotsForType(
  appointmentTypeId: string,
  tenantId: string,
): Promise<Slot[]> {
  const supabase = adminClient();

  // Service role, so RLS is off and every query here must carry the firm.
  // Settings used to be read as a singleton: with two firms that returned two
  // rows and .single() threw, taking the whole slot picker down.
  const { data: settingsRow } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .single();
  if (!settingsRow) throw new Error("appointment_settings missing");

  // 2. Load the appointment type
  const { data: typeRow } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select("duration_minutes")
    .eq("tenant_id", tenantId)
    .eq("id", appointmentTypeId)
    .eq("active", true)
    .is("deleted_at", null)
    .single();
  if (!typeRow) throw new Error("Appointment type not found or inactive");

  const now = new Date();
  const horizonEnd = new Date(
    now.getTime() + settingsRow.maximum_horizon_days * 86400 * 1000,
  );

  // 3. CRM busy: existing confirmed appointments in the horizon
  const { data: crmAppointments } = await supabase
    .schema("crm")
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("status", "confirmed")
    .is("deleted_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", horizonEnd.toISOString());

  const crmBusy = (crmAppointments ?? []).map((a) => ({
    start: a.starts_at,
    end: a.ends_at,
  }));

  // 4. Graph busy: external blocks on the info@ calendar
  // (degrades to empty array if Graph fails or permissions missing)
  const graphBusy = await getBusyIntervals(
    now.toISOString(),
    horizonEnd.toISOString(),
  );

  // 5. Generate slots
  return generateOpenSlots({
    settings: {
      hours_by_weekday: settingsRow.hours_by_weekday as unknown as HoursByWeekday,
      slot_increment_minutes: settingsRow.slot_increment_minutes,
      buffer_between_appointments_minutes:
        settingsRow.buffer_between_appointments_minutes,
      minimum_lead_time_hours: settingsRow.minimum_lead_time_hours,
      maximum_horizon_days: settingsRow.maximum_horizon_days,
      timezone: settingsRow.timezone,
    },
    duration_minutes: typeRow.duration_minutes,
    busy_intervals: [...crmBusy, ...graphBusy],
    now,
  });
}
