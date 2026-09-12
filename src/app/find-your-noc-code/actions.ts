"use server";

import { adminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// Public lead capture from the NOC finder: someone just saw their SOWP or
// Express Entry verdict and wants genzdatalabs Immigration to handle the application. Creates
// or updates a lead client; the new-lead notification trigger tells staff.

const applySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\d\s()+\-./]+$/, "Invalid phone number format"),
  intent: z.enum(["sowp", "express_entry", "not_sure"]),
  note: z.string().max(1000).optional().default(""),
  consent: z.literal(true),
  noc: z.object({
    code: z.string().max(10),
    title: z.string().max(200),
    teer: z.number().int().min(0).max(5),
    sowp_status: z.string().max(40),
  }),
});

export type NocApplyResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "rate_limited" | "failed" };

export async function submitNocApplication(
  payload: unknown,
): Promise<NocApplyResult> {
  const parsed = applySchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  const supabase = adminClient();

  // Rate limit: 3 submissions per email per hour (mirrors the booking flow).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .schema("crm")
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("email", emailLower)
    .gte("updated_at", oneHourAgo);
  if ((count ?? 0) >= 3) return { ok: false, error: "rate_limited" };

  const inquiry = {
    intent: data.intent,
    noc_code: data.noc.code,
    noc_title: data.noc.title,
    teer: data.noc.teer,
    sowp_status: data.noc.sowp_status,
    note: data.note.trim() || null,
    submitted_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, background_responses")
    .eq("email", emailLower)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .schema("crm")
      .from("clients")
      .update({
        phone_primary: data.phone.trim(),
        background_responses: {
          ...((existing.background_responses as Record<string, unknown>) ?? {}),
          noc_inquiry: inquiry,
        },
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: "failed" };
    return { ok: true };
  }

  const { data: nextNumber } = await supabase
    .schema("crm")
    .rpc("generate_client_number");
  if (!nextNumber) return { ok: false, error: "failed" };

  const parts = data.name.trim().split(/\s+/);
  const { error } = await supabase.schema("crm").from("clients").insert({
    client_number: nextNumber,
    legal_name_full: data.name.trim(),
    given_names: parts[0],
    family_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
    email: emailLower,
    phone_primary: data.phone.trim(),
    status: "lead",
    source: "noc_finder",
    background_responses: { noc_inquiry: inquiry },
  });
  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}
