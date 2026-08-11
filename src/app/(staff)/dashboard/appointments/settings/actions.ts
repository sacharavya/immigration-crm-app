"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// Single mutation: persists the firm-wide appointment_settings singleton.
// Gated by manage_settings (super_user + admin). A pre-save guard refuses
// to flip public_booking_enabled to true if there's nothing for prospects
// to see — at least one public, active, non-deleted type AND at least one
// weekday with hours configured.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type SettingsMutateResult = Ok | Err;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const range = z
  .object({
    start: z.string().regex(timeRegex, "Use HH:MM (24h)"),
    end: z.string().regex(timeRegex, "Use HH:MM (24h)"),
  })
  .refine((r) => r.start < r.end, {
    message: "Range start must be before end.",
  });

const hoursByWeekday = z.object({
  sun: z.array(range).optional(),
  mon: z.array(range).optional(),
  tue: z.array(range).optional(),
  wed: z.array(range).optional(),
  thu: z.array(range).optional(),
  fri: z.array(range).optional(),
  sat: z.array(range).optional(),
});

const schema = z.object({
  public_booking_enabled: z.boolean(),
  // APPT-7: when true, new online appointments get a Microsoft Teams
  // meeting auto-created and the join URL is stored on the appointment.
  // Requires the OnlineMeetings.ReadWrite.All Application permission in
  // Azure; sync.ts degrades gracefully when missing.
  teams_auto_create: z.boolean(),
  hours_by_weekday: hoursByWeekday,
  slot_increment_minutes: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
  ]),
  buffer_between_appointments_minutes: z.number().int().min(0).max(120),
  minimum_lead_time_hours: z.number().int().min(0).max(168),
  maximum_horizon_days: z.number().int().min(1).max(365),
  office_address: z.string().min(1).max(500),
  office_arrival_instructions: z.string().max(1000).nullable(),
  // Accept "" from the form for "no link"; normalise to null below.
  default_online_link: z
    .string()
    .url("Enter a valid URL or leave blank")
    .nullable()
    .or(z.literal("")),
  // Default RCIC whose details/signature appear on consultation agreements when
  // the booking has no assigned RCIC. "" from the form → null (auto-pick).
  default_rcic_staff_id: z.string().uuid().nullable().or(z.literal("")),
});

export type AppointmentSettingsInput = z.infer<typeof schema>;

function hasAnyHours(h: AppointmentSettingsInput["hours_by_weekday"]): boolean {
  return (
    [h.sun, h.mon, h.tue, h.wed, h.thu, h.fri, h.sat].filter(
      (d) => Array.isArray(d) && d.length > 0,
    ).length > 0
  );
}

function noOverlaps(
  h: AppointmentSettingsInput["hours_by_weekday"],
): boolean {
  for (const day of [
    h.sun,
    h.mon,
    h.tue,
    h.wed,
    h.thu,
    h.fri,
    h.sat,
  ] as const) {
    const ranges = day ?? [];
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) return false;
    }
  }
  return true;
}

export async function updateAppointmentSettings(
  raw: unknown,
): Promise<SettingsMutateResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "manage_settings")) {
    return { error: "Not authorized" };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (!noOverlaps(input.hours_by_weekday)) {
    return {
      error: "Time ranges within a day cannot overlap. Check the hours editor.",
    };
  }

  const supabase = await createClient();

  // Pre-save guard: enabling public booking requires a runnable surface.
  if (input.public_booking_enabled) {
    if (!hasAnyHours(input.hours_by_weekday)) {
      return {
        error:
          "Set business hours on at least one weekday before enabling public booking.",
      };
    }
    const { count } = await supabase
      .schema("crm")
      .from("appointment_types")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("active", true)
      .is("deleted_at", null);
    if (!count || count === 0) {
      return {
        error:
          "Mark at least one appointment type as public before enabling public booking.",
      };
    }
  }

  const normalisedLink =
    input.default_online_link === "" || input.default_online_link === null
      ? null
      : input.default_online_link;

  // The settings row is a singleton — update where id is not null catches
  // it without us having to know its UUID up-front.
  const { error } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .update({
      public_booking_enabled: input.public_booking_enabled,
      teams_auto_create: input.teams_auto_create,
      hours_by_weekday: input.hours_by_weekday,
      slot_increment_minutes: input.slot_increment_minutes,
      buffer_between_appointments_minutes:
        input.buffer_between_appointments_minutes,
      minimum_lead_time_hours: input.minimum_lead_time_hours,
      maximum_horizon_days: input.maximum_horizon_days,
      office_address: input.office_address,
      office_arrival_instructions: input.office_arrival_instructions,
      default_online_link: normalisedLink,
      default_rcic_staff_id: input.default_rcic_staff_id || null,
      updated_by: staff.id,
    })
    .not("id", "is", null);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/appointments/settings");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/book-an-appointment");
  return { ok: true };
}
