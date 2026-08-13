"use server";

import { randomBytes } from "node:crypto";

import { adminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { getOpenSlotsForType } from "@/lib/appointments/get-open-slots";
import { maybeSendConsultationAgreement } from "@/lib/consultation/send";
import {
  consultationIntakeScalars,
  consultationIntakeJsonb,
} from "@/lib/clients/consultation-intake";
import {
  syncAppointmentCreate,
  syncAppointmentDelete,
  syncAppointmentUpdate,
} from "@/lib/appointments/sync";
import {
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
  sendAppointmentReschedule,
  sendInternalNotification,
  sendPaymentPending,
  sendPaymentRejected,
} from "@/lib/email/appointments";
import { createClient } from "@/lib/supabase/server";

// All gated by manage_appointments. The Graph calendar sync is a side
// effect: a failed sync flags the row (graph_sync_status='failed') but
// does NOT roll back the CRM write. CRM is the source of truth.


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
  // Staff waive the fee on a paid type — the firm does it for free.
  pro_bono: z.boolean().default(false),
  // Core intake (same as the public booking form), all optional here.
  address: z.string().max(300).optional().default(""),
  city: z.string().max(120).optional().default(""),
  province: z.string().max(120).optional().default(""),
  postal_code: z.string().max(20).optional().default(""),
  date_of_birth: z.string().optional().default(""),
  marital_status: z.string().max(20).optional().default(""),
  highest_education: z.string().max(200).optional().default(""),
  language_test: z.string().max(60).optional().default(""),
  language_score: z.string().max(120).optional().default(""),
  occupation: z.string().max(200).optional().default(""),
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

  // Type-specific rules: requires_case + fee
  const { data: typeRow } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select("requires_case, fee_cad")
    .eq("id", input.appointment_type_id)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!typeRow) return { error: "Appointment type not found or inactive." };
  if (typeRow.requires_case && !input.case_id) {
    return { error: "This appointment type requires a case." };
  }

  const fee = typeRow.fee_cad == null ? null : Number(typeRow.fee_cad);
  const isPaid = fee !== null && fee > 0;
  // Pro bono only means anything on a paid type. It waives the fee, so the
  // appointment follows the free/confirmed path (no payment) but records the
  // waiver (is_pro_bono) and a $0 fee_cad_at_booking.
  const proBono = isPaid && input.pro_bono;
  const effectivePaid = isPaid && !proBono;

  // Paid consultations need a client_id downstream (payment row +
  // files.documents CHECK). If staff didn't link one, find-or-create a
  // lead client from the snapshot fields — same as the public flow.
  let resolvedClientId = input.client_id;
  if (!resolvedClientId) {
    const emailLower = input.snapshot_client_email.toLowerCase();
    const { data: existing } = await supabase
      .schema("crm")
      .from("clients")
      .select("id")
      .eq("email", emailLower)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      resolvedClientId = existing.id;
    } else {
      const { data: nextNumber } = await supabase
        .schema("crm")
        .rpc("generate_client_number");
      if (!nextNumber) {
        return { error: "Could not generate client number." };
      }
      const parts = input.snapshot_client_name.trim().split(/\s+/);
      const given = parts[0];
      const family = parts.length > 1 ? parts.slice(1).join(" ") : null;
      const { data: newClient, error: clientErr } = await supabase
        .schema("crm")
        .from("clients")
        .insert({
          client_number: nextNumber,
          legal_name_full: input.snapshot_client_name.trim(),
          given_names: given,
          family_name: family,
          email: emailLower,
          phone_primary: input.snapshot_client_phone,
          status: "lead",
          source: "staff_booking",
          ...consultationIntakeScalars(input),
          background_responses: consultationIntakeJsonb(input),
        })
        .select("id")
        .single();
      if (clientErr || !newClient) {
        return { error: "Could not create client record." };
      }
      resolvedClientId = newClient.id;
    }
  }

  // Store the intake on the resolved client (linked or found) too, so the
  // profile + agreement reflect what staff entered. Merge the intake JSONB so
  // it updates (language test / education / occupation) without clobbering
  // other background_responses keys.
  if (resolvedClientId) {
    const { data: cur } = await supabase
      .schema("crm")
      .from("clients")
      .select("background_responses")
      .eq("id", resolvedClientId)
      .maybeSingle();
    await supabase
      .schema("crm")
      .from("clients")
      .update({
        ...consultationIntakeScalars(input),
        background_responses: {
          ...((cur?.background_responses as Record<string, unknown>) ?? {}),
          ...consultationIntakeJsonb(input),
        },
      })
      .eq("id", resolvedClientId);
  }

  // Slot guard
  if (!(await isSlotFree(supabase, input.starts_at, input.ends_at, null))) {
    return { error: "That slot is no longer free. Pick another time." };
  }

  const staff = await getStaff();

  // APPT-9: paid consultations follow the universal flow regardless of
  // booking source. Staff-booked paid types land in pending_payment, the
  // client receives a payment-instruction email with a management link,
  // and the slot is held until midnight. Confirmation email + calendar
  // sync only fire after staff accepts the payment proof.
  const managementToken = effectivePaid
    ? randomBytes(32).toString("hex")
    : null;
  const endsAt = new Date(input.ends_at);
  const managementTokenExpiresAt = managementToken
    ? new Date(endsAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: inserted, error: insertErr } = await supabase
    .schema("crm")
    .from("appointments")
    .insert({
      appointment_type_id: input.appointment_type_id,
      client_id: resolvedClientId,
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
      created_by: staff?.id,
      // Paid: pending_payment, no calendar sync yet. Free/pro-bono: confirmed,
      // sync immediately. Pro bono records a $0 waived fee.
      status: effectivePaid ? "pending_payment" : "confirmed",
      fee_cad_at_booking: proBono ? 0 : isPaid ? fee : null,
      is_pro_bono: proBono,
      graph_sync_status: effectivePaid ? null : "pending",
      management_token: managementToken,
      management_token_expires_at: managementTokenExpiresAt,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Could not create appointment." };
  }

  const admin = adminClient();

  if (effectivePaid) {
    // Send payment-instruction email to the client (e-transfer details +
    // management URL for uploading proof). No calendar sync, no
    // confirmation — those fire only after staff accepts the proof.
    await sendPaymentPending(admin, inserted.id);
    await sendInternalNotification(admin, inserted.id);
  } else {
    // Free flow: Graph sync + confirmation + internal notification.
    await syncAppointmentCreate(admin, inserted.id);
    if (input.send_confirmation_email) {
      const confRes = await sendAppointmentConfirmation(admin, inserted.id);
      if (confRes.ok) {
        await admin
          .schema("crm")
          .from("appointments")
          .update({ confirmation_email_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      }
    }
    await sendInternalNotification(admin, inserted.id);
  }

  // Email a consultation-agreement sign-link if the type requires it and the
  // client is a first-time (non-retained) client. Covers pro-bono too.
  await maybeSendConsultationAgreement(admin, inserted.id);

  revalidateLinked(input.case_id, resolvedClientId);
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
    .select("id, status, case_id, client_id, staff_notes, starts_at")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };
  if (existing.status !== "confirmed") {
    return { error: "Only confirmed appointments can be rescheduled." };
  }
  const previousStartsAt = existing.starts_at;

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

  const admin = adminClient();
  await syncAppointmentUpdate(admin, id);
  await sendAppointmentReschedule(admin, id, previousStartsAt);

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

  const admin = adminClient();
  await syncAppointmentDelete(admin, id);
  await sendAppointmentCancellation(admin, id);

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
// updateAppointmentNotes (staff_notes only)
//
// Staff notes are internal. The client-provided reason is intentionally NOT
// editable here: it is the client's own words, and changing it would re-sync
// the calendar event and email the client an updated invite. Editing staff
// notes never touches the calendar and never notifies the client.
// ---------------------------------------------------------------------------

const notesSchema = z.object({
  id: uuid,
  staff_notes: z.string().max(2000).nullable(),
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
  const { id, staff_notes } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };

  const { error } = await supabase
    .schema("crm")
    .from("appointments")
    .update({ staff_notes })
    .eq("id", id);
  if (error) return { error: error.message };

  // No calendar re-sync and no client email: staff notes are internal only.
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
// assignAppointment — assign or reassign a staff member
// ---------------------------------------------------------------------------

export async function assignAppointment(
  appointmentId: string,
  staffId: string | null,
): Promise<MutateResult> {
  const auth = await requirePermission();
  if (!auth.ok) return { error: auth.error };
  if (!uuid.safeParse(appointmentId).success) return { error: "Invalid id" };
  if (staffId !== null && !uuid.safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, case_id, client_id")
    .eq("id", appointmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existing) return { error: "Appointment not found." };

  const { error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({ assigned_staff_id: staffId })
    .eq("id", appointmentId);
  if (updErr) return { error: updErr.message };

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

// ---------------------------------------------------------------------------
// APPT-8: accept / reject Interac e-transfer proofs.
//
// Permission is review_payments (super_user / admin / rcic / reception).
// Accept transitions awaiting_review → confirmed AND creates a crm.payments
// row (no case_id; consultation_payment_nature='pending_decision'), then
// triggers the Graph sync (calendar + Teams meeting) and confirmation email
// for the first time. Reject transitions to cancelled and fires the
// rejection email; no payment row is created and the proof stays attached
// for audit.
// ---------------------------------------------------------------------------

async function requireReviewPayments(): Promise<
  { ok: true; staffId: string } | { ok: false; error: string }
> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Not authenticated" };
  if (!staffCan(staff, "review_payments")) {
    return { ok: false, error: "Not authorized" };
  }
  return { ok: true, staffId: staff.id };
}

export async function acceptAppointmentPayment(
  appointmentId: string,
): Promise<MutateResult> {
  const auth = await requireReviewPayments();
  if (!auth.ok) return { error: auth.error };
  if (!uuid.safeParse(appointmentId).success) return { error: "Invalid id" };

  const admin = adminClient();

  const { data: appt } = await admin
    .schema("crm")
    .from("appointments")
    .select(
      "id, status, client_id, case_id, fee_cad_at_booking, payment_screenshot_id",
    )
    .eq("id", appointmentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { error: "Appointment not found." };
  if (appt.status !== "awaiting_review") {
    return { error: "Only appointments awaiting review can be accepted." };
  }
  if (!appt.client_id) {
    return { error: "Appointment is missing a client_id." };
  }
  const fee = Number(appt.fee_cad_at_booking ?? 0);
  if (fee <= 0) {
    return { error: "Appointment has no fee snapshot to charge against." };
  }

  // 1. Insert the payment row. consultation_payment_nature starts as
  // pending_decision; staff flips it on the Payments page once the client
  // either retains the firm (applied_as_deposit) or doesn't
  // (kept_as_consultation_fee).
  const { data: payment, error: payErr } = await admin
    .schema("crm")
    .from("payments")
    .insert({
      client_id: appt.client_id,
      case_id: null,
      amount_cad: fee,
      method: "e_transfer",
      received_date: new Date().toISOString().slice(0, 10),
      reference: `appt:${appt.id.slice(0, 8)}`,
      notes: `Consultation payment for appointment ${appt.id.slice(0, 8)}`,
      proof_document_id: appt.payment_screenshot_id,
      consultation_payment_nature: "pending_decision",
      recorded_by: auth.staffId,
      is_refund: false,
    })
    .select("id")
    .single();
  if (payErr || !payment) {
    return { error: payErr?.message ?? "Could not create payment row." };
  }

  // 2. Flip the appointment to confirmed + record reviewer + link payment.
  const { error: updErr } = await admin
    .schema("crm")
    .from("appointments")
    .update({
      status: "confirmed",
      payment_reviewed_by: auth.staffId,
      payment_reviewed_at: new Date().toISOString(),
      linked_payment_id: payment.id,
      graph_sync_status: "pending",
    })
    .eq("id", appointmentId);
  if (updErr) return { error: updErr.message };

  // 3. Graph sync (calendar event + Teams meeting if enabled) — first time
  // for paid bookings since we deferred it at booking time.
  await syncAppointmentCreate(admin, appointmentId);

  // 4. Confirmation email (also first time for this appointment).
  const confRes = await sendAppointmentConfirmation(admin, appointmentId);
  if (confRes.ok) {
    await admin
      .schema("crm")
      .from("appointments")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", appointmentId);
  }

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/payments");
  if (appt.case_id) revalidatePath(`/dashboard/cases/${appt.case_id}`);
  if (appt.client_id) revalidatePath(`/dashboard/clients/${appt.client_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const rejectPaymentSchema = z.object({
  id: uuid,
  reason: z.string().min(1).max(500),
});

export async function rejectAppointmentPayment(
  raw: unknown,
): Promise<MutateResult> {
  const auth = await requireReviewPayments();
  if (!auth.ok) return { error: auth.error };
  const parsed = rejectPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, reason } = parsed.data;

  const admin = adminClient();
  const { data: appt } = await admin
    .schema("crm")
    .from("appointments")
    .select("id, status, case_id, client_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { error: "Appointment not found." };
  if (appt.status !== "awaiting_review") {
    return { error: "Only appointments awaiting review can be rejected." };
  }

  const { error: updErr } = await admin
    .schema("crm")
    .from("appointments")
    .update({
      status: "cancelled",
      cancellation_reason: reason,
      cancelled_by: auth.staffId,
      cancelled_at: new Date().toISOString(),
      payment_reviewed_by: auth.staffId,
      payment_reviewed_at: new Date().toISOString(),
      payment_rejection_reason: reason,
    })
    .eq("id", id);
  if (updErr) return { error: updErr.message };

  await sendPaymentRejected(admin, id, reason);

  revalidatePath("/dashboard/appointments");
  if (appt.case_id) revalidatePath(`/dashboard/cases/${appt.case_id}`);
  if (appt.client_id) revalidatePath(`/dashboard/clients/${appt.client_id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
