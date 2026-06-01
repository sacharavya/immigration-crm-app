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
