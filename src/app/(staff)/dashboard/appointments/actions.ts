"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { getOpenSlotsForType } from "@/lib/appointments/get-open-slots";
import {
  syncAppointmentCreate,
  syncAppointmentDelete,
  syncAppointmentUpdate,
} from "@/lib/appointments/sync";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

// All gated by manage_appointments. The Graph calendar sync is a side
// effect: a failed sync flags the row (graph_sync_status='failed') but
// does NOT roll back the CRM write. CRM is the source of truth.

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();

const createSchema = z.object({
  appointment_type_id: uuid,
  client_id: uuid.nullable(),
  case_id: uuid.nullable(),
  snapshot_client_name: z.string().min(1).max(200),
  snapshot_client_email: z.string().email().max(200),
  snapshot_client_phone: z.string().max(50).nullable(),
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  timezone: z.string().default("America/Toronto"),
  location_type: z.enum(["online", "onsite"]),
  online_link: z.string().max(500).nullable(),
  onsite_address: z.string().max(500).nullable(),
  assigned_staff_id: uuid.nullable(),
  reason: z.string().min(1).max(2000),
  staff_notes: z.string().max(2000).nullable(),
  send_confirmation_email: z.boolean().default(true),
});

export type CreateAppointmentInput = z.infer<typeof createSchema>;

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type MutateResult = Ok | Err;
export type CreateResult = (Ok & { id: string }) | Err;

async function requirePermission(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Not authenticated" };
  if (!staffCan(staff, "manage_appointments")) {
    return { ok: false, error: "Not authorized" };
  }
  return { ok: true };
}

async function isSlotFree(
  supabase: Awaited<ReturnType<typeof createClient>>,
  startsAt: string,
  endsAt: string,
  excludeId: string | null,
): Promise<boolean> {
  const { data, error } = await supabase
    .schema("crm")
    .rpc("appointment_slot_is_free", {
      p_starts_at: startsAt,
      p_ends_at: endsAt,
      p_exclude_appointment_id: excludeId ?? undefined,
    });
  if (error) return false;
  return data === true;
}

function revalidateLinked(caseId: string | null, clientId: string | null) {
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");
  if (caseId) revalidatePath(`/dashboard/cases/${caseId}`);
  if (clientId) revalidatePath(`/dashboard/clients/${clientId}`);
}

// ---------------------------------------------------------------------------
// createAppointment
// ---------------------------------------------------------------------------

export async function createAppointment(
  raw: unknown,
): Promise<CreateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  if (new Date(input.ends_at) <= new Date(input.starts_at)) {
    return { error: "End time must be after start time." };
  }
  if (input.location_type === "onsite" && !input.onsite_address?.trim()) {
    return { error: "Onsite appointments require an address." };
  }

  const supabase = await createClient();

  // Type-specific rules: requires_case
  const { data: typeRow } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select("requires_case")
    .eq("id", input.appointment_type_id)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!typeRow) return { error: "Appointment type not found or inactive." };
  if (typeRow.requires_case && !input.case_id) {
    return { error: "This appointment type requires a case." };
  }

  // Slot guard
  if (!(await isSlotFree(supabase, input.starts_at, input.ends_at, null))) {
    return { error: "That slot is no longer free. Pick another time." };
  }

  const staff = await getStaff();

  const { data: inserted, error: insertErr } = await supabase
    .schema("crm")
    .from("appointments")
    .insert({
      appointment_type_id: input.appointment_type_id,
      client_id: input.client_id,
      case_id: input.case_id,
      snapshot_client_name: input.snapshot_client_name,
      snapshot_client_email: input.snapshot_client_email,
      snapshot_client_phone: input.snapshot_client_phone,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      timezone: input.timezone,
      location_type: input.location_type,
      online_link: input.online_link,
      onsite_address: input.onsite_address,
      assigned_staff_id: input.assigned_staff_id,
      reason: input.reason,
      staff_notes: input.staff_notes,
      booking_source: "staff",
      graph_sync_status: "pending",
      created_by: staff?.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Could not create appointment." };
  }

  // Fire-and-update Graph sync. Never throws; flips graph_sync_status.
  await syncAppointmentCreate(adminClient(), inserted.id);

  // PART E: confirmation email flag is recorded as intent only. APPT-5
  // wires the actual send.
  if (input.send_confirmation_email) {
    console.log(
      `[appointments] confirmation email queued (placeholder) for ${inserted.id}`,
    );
  }

  revalidateLinked(input.case_id, input.client_id);
  return { ok: true, id: inserted.id };
}

// ---------------------------------------------------------------------------
// rescheduleAppointment
// ---------------------------------------------------------------------------

const rescheduleSchema = z.object({
  id: uuid,
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  reason: z.string().max(1000).nullable(),
});

export async function rescheduleAppointment(
  raw: unknown,
): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };

  const parsed = rescheduleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, starts_at, ends_at, reason } = parsed.data;

  if (new Date(ends_at) <= new Date(starts_at)) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, status, case_id, client_id, staff_notes")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };
  if (existing.status !== "confirmed") {
    return { error: "Only confirmed appointments can be rescheduled." };
  }

  if (!(await isSlotFree(supabase, starts_at, ends_at, id))) {
    return { error: "That slot is no longer free. Pick another time." };
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const reschedNote = reason
    ? `[${stamp}] Rescheduled: ${reason}`
    : `[${stamp}] Rescheduled.`;
  const mergedNotes = existing.staff_notes
    ? `${existing.staff_notes}\n${reschedNote}`
    : reschedNote;

  const { error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      starts_at,
      ends_at,
      staff_notes: mergedNotes,
    })
    .eq("id", id);
  if (updErr) return { error: updErr.message };

  await syncAppointmentUpdate(adminClient(), id);

  revalidateLinked(existing.case_id, existing.client_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// cancelAppointment
// ---------------------------------------------------------------------------

const cancelSchema = z.object({
  id: uuid,
  reason: z.string().min(1).max(1000),
});

export async function cancelAppointment(
  raw: unknown,
): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };

  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, reason } = parsed.data;

  const supabase = await createClient();
  const staff = await getStaff();

  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };

  const { error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: staff?.id ?? null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) return { error: updErr.message };

  await syncAppointmentDelete(adminClient(), id);

  revalidateLinked(existing.case_id, existing.client_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// markCompleted / markNoShow
// ---------------------------------------------------------------------------

async function setStatus(
  id: string,
  status: "completed" | "no_show",
): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };
  if (!uuid.safeParse(id).success) return { error: "Invalid id" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, status, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };
  if (existing.status !== "confirmed") {
    return { error: "Only confirmed appointments can be transitioned." };
  }

  const { error } = await supabase
    .schema("crm")
    .from("appointments")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidateLinked(existing.case_id, existing.client_id);
  return { ok: true };
}

export async function markCompleted(id: string): Promise<MutateResult> {
  return setStatus(id, "completed");
}
export async function markNoShow(id: string): Promise<MutateResult> {
  return setStatus(id, "no_show");
}

// ---------------------------------------------------------------------------
// updateAppointmentNotes (reason + staff_notes)
// ---------------------------------------------------------------------------

const notesSchema = z.object({
  id: uuid,
  reason: z.string().min(1).max(2000).optional(),
  staff_notes: z.string().max(2000).nullable().optional(),
});

export async function updateAppointmentNotes(
  raw: unknown,
): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };

  const parsed = notesSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, reason, staff_notes } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, reason, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };

  const patch: { reason?: string; staff_notes?: string | null } = {};
  if (reason !== undefined) patch.reason = reason;
  if (staff_notes !== undefined) patch.staff_notes = staff_notes;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .schema("crm")
    .from("appointments")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };

  // If the reason changed, re-sync the calendar event body.
  if (reason !== undefined && reason !== existing.reason) {
    await syncAppointmentUpdate(adminClient(), id);
  }

  revalidateLinked(existing.case_id, existing.client_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// retryCalendarSync
// ---------------------------------------------------------------------------

export async function retryCalendarSync(id: string): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };
  if (!uuid.safeParse(id).success) return { error: "Invalid id" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, graph_event_id, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };

  const admin = adminClient();
  if (existing.graph_event_id) {
    await syncAppointmentUpdate(admin, id);
  } else {
    await syncAppointmentCreate(admin, id);
  }

  revalidateLinked(existing.case_id, existing.client_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// getAvailableSlots — used by the new-appointment dialog
// ---------------------------------------------------------------------------

export type DayOfSlots = {
  date: string; // YYYY-MM-DD in firm timezone
  slots: { start_utc: string; end_utc: string }[];
};

export async function getAvailableSlots(
  typeId: string,
  fromIso: string,
  toIso: string,
): Promise<(Ok & { days: DayOfSlots[] }) | Err> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };
  if (!uuid.safeParse(typeId).success) return { error: "Invalid type" };

  try {
    const allSlots = await getOpenSlotsForType(typeId);

    const fromTime = new Date(fromIso).getTime();
    const toTime = new Date(toIso).getTime();
    const filtered = allSlots.filter((s) => {
      const t = new Date(s.start_utc).getTime();
      return t >= fromTime && t <= toTime;
    });

    // Group by calendar date in firm tz. The slot's start_utc is the
    // absolute instant; we bucket by its YYYY-MM-DD in America/Toronto.
    const grouped = new Map<string, DayOfSlots["slots"]>();
    for (const slot of filtered) {
      const date = new Date(slot.start_utc).toLocaleDateString("en-CA", {
        timeZone: "America/Toronto",
      });
      const arr = grouped.get(date) ?? [];
      arr.push(slot);
      grouped.set(date, arr);
    }
    const days: DayOfSlots[] = Array.from(grouped.entries())
      .map(([date, slots]) => ({ date, slots }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { ok: true, days };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load slots",
    };
  }
}
