"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// APPT-8: outcome tri-state for consultation payments. Permission is
// review_payments (same gate as accept/reject). The DB CHECK constraint
// guards the enum; we mirror it in zod so the form can't post junk.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type PaymentNatureResult = Ok | Err;

const schema = z.object({
  payment_id: z.string().uuid(),
  nature: z.enum([
    "pending_decision",
    "applied_as_deposit",
    "kept_as_consultation_fee",
  ]),
});

export async function updateConsultationPaymentNature(
  raw: unknown,
): Promise<PaymentNatureResult> {
  const staff = await getStaff();
  if (!staff) return { error: "Not authenticated" };
  if (!staffCan(staff, "review_payments")) {
    return { error: "Not authorized" };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  // The action only fires from rows that already have
  // consultation_payment_nature set (a non-consultation payment never
  // surfaces the dropdown), so we don't need to gate on row shape — the
  // DB CHECK constraint refuses any non-allowed value anyway.
  const { error } = await supabase
    .schema("crm")
    .from("payments")
    .update({ consultation_payment_nature: parsed.data.nature })
    .eq("id", parsed.data.payment_id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/payments");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client-uploaded payment proof verification.
//
// The /pay/<token> portal creates a crm.payments row stamped with
// client_uploaded_at when the client submits a screenshot. That row
// is INVISIBLE to the case's "amount paid" math until staff calls
// verifyClientUpload(). Reject = soft-delete + reason captured in
// notes; the row drops off the balance immediately.
// ---------------------------------------------------------------------------

const verifySchema = z.object({
  paymentId: z.string().uuid(),
});

export async function verifyClientUpload(
  input: z.input<typeof verifySchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "review_payments")) {
    return { error: "You don't have permission to verify payments." };
  }

  const supabase = await createClient();

  // Precondition: row must be a client upload that's not already
  // verified or soft-deleted. The status precondition collapses
  // double-clicks to "already verified" without errors.
  const { data: row, error: updErr } = await supabase
    .schema("crm")
    .from("payments")
    .update({
      verified_at: new Date().toISOString(),
      verified_by: me.id,
    })
    .eq("id", parsed.data.paymentId)
    .is("verified_at", null)
    .is("deleted_at", null)
    .not("client_uploaded_at", "is", null)
    .select("id, case_id, amount_cad")
    .maybeSingle();

  if (updErr) return { error: `Could not verify: ${updErr.message}` };
  if (!row) {
    return {
      error:
        "This payment is no longer pending. Refresh — someone may have already verified or rejected it.",
    };
  }

  // Audit on the case timeline. Consultation payments without a case
  // (paid bookings before the lead retains) skip this — the row's
  // own audit trigger already logs the verified_at flip.
  if (row.case_id) {
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: row.case_id,
        event_type: "fee_collected",
        event_data: {
          kind: "client_upload_verified",
          payment_id: row.id,
          amount_cad: row.amount_cad,
        },
        description: `Verified client payment upload ($${Number(row.amount_cad).toFixed(2)}).`,
        visible_to_client: false,
        created_by: me.id,
      });
  }

  revalidatePath("/dashboard/payments");
  if (row.case_id) revalidatePath(`/dashboard/cases/${row.case_id}`);
  return { ok: true };
}

const rejectSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(1, "Tell the client why").max(500),
});

export async function rejectClientUpload(
  input: z.input<typeof rejectSchema>,
): Promise<{ ok: true } | { error: string }> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "review_payments")) {
    return { error: "You don't have permission to reject payments." };
  }

  const supabase = await createClient();

  const { data: row, error: updErr } = await supabase
    .schema("crm")
    .from("payments")
    .update({
      deleted_at: new Date().toISOString(),
      notes: `Rejected by staff: ${parsed.data.reason}`,
    })
    .eq("id", parsed.data.paymentId)
    .is("verified_at", null)
    .is("deleted_at", null)
    .not("client_uploaded_at", "is", null)
    .select("id, case_id, amount_cad")
    .maybeSingle();

  if (updErr) return { error: `Could not reject: ${updErr.message}` };
  if (!row) {
    return {
      error:
        "This payment is no longer pending. Refresh — someone may have already verified or rejected it.",
    };
  }

  if (row.case_id) {
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: row.case_id,
        event_type: "other",
        event_data: {
          kind: "client_upload_rejected",
          payment_id: row.id,
          amount_cad: row.amount_cad,
          reason: parsed.data.reason,
        },
        description: `Rejected client payment upload ($${Number(row.amount_cad).toFixed(2)}): ${parsed.data.reason}`,
        visible_to_client: false,
        created_by: me.id,
      });
  }

  revalidatePath("/dashboard/payments");
  if (row.case_id) revalidatePath(`/dashboard/cases/${row.case_id}`);
  return { ok: true };
}
