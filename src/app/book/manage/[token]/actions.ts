"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  syncAppointmentDelete,
  syncAppointmentUpdate,
} from "@/lib/appointments/sync";
import type { Database } from "@/lib/supabase/types";

// Public reschedule/cancel actions invoked from /book/manage/[token].
// Authentication is the token itself. CRM is the source of truth: a failed
// Graph sync flags the row but does not roll back the CRM write.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type ManageResult = Ok | Err;

const TOKEN_RE = /^[0-9a-f]{64}$/i;

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

const rescheduleSchema = z.object({
  token: z.string().regex(TOKEN_RE),
  new_starts_at: z.string().datetime(),
});

export async function publicReschedule(
  raw: unknown,
): Promise<ManageResult> {
  const parsed = rescheduleSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid_input" };
  const { token, new_starts_at } = parsed.data;

  const supabase = adminClient();

  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      "id, status, appointment_type_id, management_token_expires_at, starts_at, staff_notes",
    )
    .eq("management_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { error: "invalid_token" };
  if (
    appt.management_token_expires_at &&
    new Date(appt.management_token_expires_at) < new Date()
  ) {
    return { error: "token_expired" };
  }
  if (appt.status !== "confirmed") return { error: "not_active" };

  // Recompute end from the type's duration so the prospect can't pick a
  // longer window than they originally booked.
  const { data: type } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select("duration_minutes")
    .eq("id", appt.appointment_type_id)
    .maybeSingle();
  if (!type) return { error: "invalid_type" };

  const startsAt = new Date(new_starts_at);
  const endsAt = new Date(
    startsAt.getTime() + type.duration_minutes * 60 * 1000,
  );

  const { data: slotFree } = await supabase
    .schema("crm")
    .rpc("appointment_slot_is_free", {
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_exclude_appointment_id: appt.id,
    });
  if (slotFree !== true) return { error: "slot_taken" };

  const stamp = new Date().toISOString().slice(0, 10);
  const note = `[${stamp}] Rescheduled via public link.`;
  const mergedNotes = appt.staff_notes
    ? `${appt.staff_notes}\n${note}`
    : note;

  const { error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      staff_notes: mergedNotes,
    })
    .eq("id", appt.id);
  if (updErr) return { error: updErr.message };

  await syncAppointmentUpdate(supabase, appt.id);

  console.log(
    `[book/manage] reschedule email queued (placeholder) for ${appt.id}`,
  );

  return { ok: true };
}

const cancelSchema = z.object({
  token: z.string().regex(TOKEN_RE),
  reason: z.string().min(1).max(1000),
});

export async function publicCancel(raw: unknown): Promise<ManageResult> {
  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid_input" };
  const { token, reason } = parsed.data;

  const supabase = adminClient();

  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, status, management_token_expires_at")
    .eq("management_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { error: "invalid_token" };
  if (
    appt.management_token_expires_at &&
    new Date(appt.management_token_expires_at) < new Date()
  ) {
    return { error: "token_expired" };
  }
  if (appt.status !== "confirmed") return { error: "not_active" };

  const { error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: null,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", appt.id);
  if (updErr) return { error: updErr.message };

  await syncAppointmentDelete(supabase, appt.id);

  console.log(
    `[book/manage] cancellation email queued (placeholder) for ${appt.id}`,
  );

  return { ok: true };
}
