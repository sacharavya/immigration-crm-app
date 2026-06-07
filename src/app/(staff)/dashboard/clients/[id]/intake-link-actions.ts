"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { sendEmail } from "@/lib/email/client";
import { logEmail } from "@/lib/email/log";
import { shouldRateLimit } from "@/lib/email/rate-limit";
import { intakeInviteEmail } from "@/lib/email/templates/intake-invite";
import { getBaseUrl } from "@/lib/email/url";
import { createClient } from "@/lib/supabase/server";

// Staff actions for the client-self-serve intake portal.
//
// All four ops gate on edit_clients (same permission as the staff
// intake form itself). The token UPSERTs into crm.clients; the
// underlying audit trigger captures each change automatically.

export type GenerateIntakeLinkResult =
  | { ok: true; token: string }
  | { error: string };

export async function generateIntakeLink(
  clientId: string,
): Promise<GenerateIntakeLinkResult> {
  if (!z.string().uuid().safeParse(clientId).success) {
    return { error: "Invalid client id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_clients")) {
    return { error: "You don't have permission to share this intake form." };
  }

  const supabase = await createClient();

  // Refuse to mint a link on top of a submitted form — staff must
  // explicitly reopen first. Prevents an accidental "share" click from
  // silently unlocking a finalised form.
  const { data: current } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, intake_submitted_at, deleted_at")
    .eq("id", clientId)
    .maybeSingle();
  if (!current || current.deleted_at) return { error: "Client not found" };
  if (current.intake_submitted_at) {
    return {
      error:
        "This client has already submitted the intake form. Reopen it for changes before generating a new link.",
    };
  }

  const token = randomUUID();
  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .update({
      intake_portal_token: token,
      intake_portal_token_created_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true, token };
}

export async function revokeIntakeLink(
  clientId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(clientId).success) {
    return { error: "Invalid client id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_clients")) {
    return { error: "You don't have permission to revoke this link." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .update({
      intake_portal_token: null,
      intake_portal_token_created_at: null,
    })
    .eq("id", clientId)
    .is("deleted_at", null);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}

// Clears intake_submitted_at so the client can pick the form back up.
// Requires an active token — if none exists, staff should generate a
// fresh link as part of the reopen flow.
export async function reopenIntakeForm(
  clientId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(clientId).success) {
    return { error: "Invalid client id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_clients")) {
    return { error: "You don't have permission to reopen this form." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .update({ intake_submitted_at: null })
    .eq("id", clientId)
    .is("deleted_at", null);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}

const emailIntakeLinkSchema = z.object({
  clientId: z.string().uuid(),
  recipientEmail: z.string().email("Enter a valid email"),
  customMessage: z.string().trim().max(1000).optional(),
});

export type EmailIntakeLinkResult =
  | { ok: true; emailSent: boolean; emailError?: string }
  | { error: string };

export async function emailIntakeLink(
  input: z.input<typeof emailIntakeLinkSchema>,
): Promise<EmailIntakeLinkResult> {
  const parsed = emailIntakeLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_clients")) {
    return { error: "You don't have permission to share this intake form." };
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      "id, legal_name_full, given_names, preferred_name, intake_portal_token, intake_submitted_at, deleted_at",
    )
    .eq("id", parsed.data.clientId)
    .maybeSingle();
  if (!client || client.deleted_at) return { error: "Client not found" };
  if (!client.intake_portal_token) {
    return { error: "Generate an intake link before emailing it." };
  }
  if (client.intake_submitted_at) {
    return {
      error:
        "This client has already submitted the intake form. Reopen it for changes before sending another invite.",
    };
  }

  const clientName =
    client.preferred_name?.trim() ||
    client.given_names?.trim() ||
    client.legal_name_full ||
    "there";

  const limited = await shouldRateLimit(
    "client_intake_invite",
    parsed.data.recipientEmail,
  );
  if (limited) {
    return {
      ok: true,
      emailSent: false,
      emailError: "Rate limit reached for this recipient. Try again later.",
    };
  }

  const baseUrl = await getBaseUrl();
  const intakeUrl = `${baseUrl}/intake/${client.intake_portal_token}`;
  const tpl = intakeInviteEmail({
    clientName,
    intakeUrl,
    customMessage: parsed.data.customMessage,
  });

  const res = await sendEmail({
    to: parsed.data.recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  await logEmail({
    supabase,
    clientId: client.id,
    staffId: me.id,
    to: parsed.data.recipientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  revalidatePath(`/dashboard/clients/${client.id}`);
  return {
    ok: true,
    emailSent: res.ok,
    emailError: res.ok ? undefined : res.error,
  };
}
