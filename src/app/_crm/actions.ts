"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { adminClient } from "@/lib/supabase/admin";

// Public B2B lead capture: a firm asking to join the CaseBind alpha program.
// Inserts via service role; a DB trigger fans out the staff notification.

const requestSchema = z.object({
  firmName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\d\s()+\-./]+$/, "Invalid phone number format"),
  rcicNumber: z.string().max(50).optional().default(""),
  firmSize: z.enum(["solo", "2-5", "6-15", "16+"]),
  currentSoftware: z.string().max(200).optional().default(""),
  message: z.string().max(2000).optional().default(""),
  consent: z.literal(true),
});

export type AccessRequestResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "rate_limited" | "failed" };

export async function submitAccessRequest(
  payload: unknown,
): Promise<AccessRequestResult> {
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  // software_access_requests is newer than the generated Database types;
  // untyped view, same as the NOC search route.
  const supabase = adminClient() as unknown as SupabaseClient;

  // Rate limit: 3 submissions per email per hour (mirrors the NOC form).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .schema("crm")
    .from("software_access_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", emailLower)
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 3) return { ok: false, error: "rate_limited" };

  const { error } = await supabase
    .schema("crm")
    .from("software_access_requests")
    .insert({
      firm_name: data.firmName.trim(),
      contact_name: data.contactName.trim(),
      email: emailLower,
      phone: data.phone.trim(),
      rcic_number: data.rcicNumber.trim() || null,
      firm_size: data.firmSize,
      current_software: data.currentSoftware.trim() || null,
      message: data.message.trim() || null,
    });
  if (error) {
    console.error("[crm/access-request] insert failed:", error.message);
    return { ok: false, error: "failed" };
  }
  return { ok: true };
}
