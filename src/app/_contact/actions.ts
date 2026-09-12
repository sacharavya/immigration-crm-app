"use server";

import { z } from "zod";

import { adminClient } from "@/lib/supabase/admin";

import { CONTACT_SERVICES } from "./constants";

// Homepage contact form: an application client asking about a service.
// Same lead-capture pattern as the NOC finder form: find-or-create a lead
// client; the existing new-lead notification trigger rings the staff bell.

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\d\s()+\-./]+$/, "Invalid phone number format"),
  service: z.enum(CONTACT_SERVICES),
  message: z.string().max(2000).optional().default(""),
  consent: z.literal(true),
});

export type ContactResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "rate_limited" | "failed" };

export async function submitContactInquiry(
  payload: unknown,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  const supabase = adminClient();

  // Rate limit: 3 submissions per email per hour (mirrors the NOC form).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .schema("crm")
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("email", emailLower)
    .gte("updated_at", oneHourAgo);
  if ((count ?? 0) >= 3) return { ok: false, error: "rate_limited" };

  const inquiry = {
    service: data.service,
    message: data.message.trim() || null,
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
          website_inquiry: inquiry,
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
    source: "website_contact",
    background_responses: { website_inquiry: inquiry },
  });
  if (error) return { ok: false, error: "failed" };
  return { ok: true };
}
