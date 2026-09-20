import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { firmPublicUrl } from "@/lib/email/url";
import { createClient } from "@/lib/supabase/server";
import { requireStaffTenantId } from "@/lib/tenant/context";

import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

type Range = { start: string; end: string };
type HoursByWeekday = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", Range[]>
>;

export default async function AppointmentSettingsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_settings")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select(
      "public_booking_enabled, teams_auto_create, hours_by_weekday, slot_increment_minutes, buffer_between_appointments_minutes, minimum_lead_time_hours, maximum_horizon_days, office_address, office_arrival_instructions, default_online_link, default_rcic_staff_id, timezone",
    )
    .maybeSingle();

  const { data: rcicRows } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, first_name, last_name")
    .eq("is_rcic", true)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("first_name");
  const rcicOptions = (rcicRows ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`.trim(),
  }));

  if (!settings) {
    // The singleton is seeded in the APPT-1 migration — if it's missing
    // something is wrong with the DB state, not the page.
    return (
      <div className="p-6">
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Appointment settings row missing. Re-apply the appointments module
          migration.
        </p>
      </div>
    );
  }

  // The firm's own public address — its custom domain or its subdomain —
  // not whichever host the staff member signed in on. Staff live on the app
  // host; prospects do not.
  const publicBookingUrl = `${await firmPublicUrl(await requireStaffTenantId())}/book-an-appointment`;

  const incrementRaw = settings.slot_increment_minutes;
  const increment: 15 | 30 | 60 =
    incrementRaw === 15 || incrementRaw === 30 || incrementRaw === 60
      ? (incrementRaw as 15 | 30 | 60)
      : 30;

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">
          Appointment settings
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Booking hours, location defaults, and the toggle that exposes
          /book-an-appointment to the world.
        </p>
      </header>

      <SettingsForm
        publicBookingUrl={publicBookingUrl}
        rcicOptions={rcicOptions}
        initial={{
          default_rcic_staff_id: settings.default_rcic_staff_id,
          public_booking_enabled: settings.public_booking_enabled,
          teams_auto_create: settings.teams_auto_create,
          hours_by_weekday: (settings.hours_by_weekday ?? {}) as HoursByWeekday,
          slot_increment_minutes: increment,
          buffer_between_appointments_minutes:
            settings.buffer_between_appointments_minutes,
          minimum_lead_time_hours: settings.minimum_lead_time_hours,
          maximum_horizon_days: settings.maximum_horizon_days,
          office_address: settings.office_address,
          office_arrival_instructions: settings.office_arrival_instructions,
          default_online_link: settings.default_online_link,
          timezone: settings.timezone,
        }}
      />
    </div>
  );
}
