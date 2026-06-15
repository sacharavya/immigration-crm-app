"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { splitLegalName } from "@/lib/clients/name";
import { createClient } from "@/lib/supabase/server";
import { newClientSchema, type NewClientInput } from "@/lib/validators/case";

// ---------------------------------------------------------------------------
// deleteClient (PERM-1)
//
// Hard delete a client. super_user only — gated here and by the
// crm.clients delete RLS policy from migration 20260501000005, now tightened
// by the rewritten staff_can() in 20260502000007.
//
// Refused if any cases (including soft-deleted) still reference this
// client. The intake history tables (family / education / employment /
// travel / address) cascade automatically per migration 001.
//
// No UI consumer yet — the clients list doesn't have a detail page. This
// action exists so a future detail page can call it without revisiting
// permission plumbing.
// ---------------------------------------------------------------------------

export async function deleteClient(
  clientId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(clientId).success) {
    return { error: "Invalid client id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "delete_clients")) {
    return { error: "Only a super user can permanently delete a client." };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .schema("crm")
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete: client has ${count} case${count === 1 ? "" : "s"} (including archived). Delete the cases first.`,
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("clients")
    .delete()
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/clients");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// createClientStandalone
//
// Used by the standalone /dashboard/clients/new page when staff want to
// capture a lead before any case exists. Mirrors the inline new-client
// branch of createCase() so the underlying validator + insert shape stay
// in lock-step.
// ---------------------------------------------------------------------------

export async function createClientStandalone(
  input: NewClientInput,
): Promise<{ ok: true; id: string } | { error: string }> {
  const parsed = newClientSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "create_clients")) {
    return { error: "You don't have permission to create clients." };
  }

  const supabase = await createClient();

  const { data: clientNumber, error: numErr } = await supabase
    .schema("crm")
    .rpc("generate_client_number");
  if (numErr || !clientNumber) {
    return {
      error: `Could not generate client number: ${numErr?.message ?? "unknown"}`,
    };
  }

  // Derive first/last from the full legal name so downstream surfaces
  // (retainer PDF, emails, intake checklist) don't get empty name
  // fields. The intake form lets staff override the split if the
  // derived value is wrong (e.g. compound family names).
  const { given_names, family_name } = splitLegalName(
    parsed.data.legal_name_full,
  );

  const { data: newClient, error: insertErr } = await supabase
    .schema("crm")
    .from("clients")
    .insert({
      client_number: clientNumber as unknown as string,
      legal_name_full: parsed.data.legal_name_full,
      given_names,
      family_name,
      email: parsed.data.email ?? null,
      phone_primary: parsed.data.phone_primary ?? null,
      phone_whatsapp: parsed.data.phone_whatsapp ?? null,
      country_of_citizenship: parsed.data.country_of_citizenship ?? null,
      date_of_birth: parsed.data.date_of_birth ?? null,
      status: "lead",
      created_by: me.id,
    })
    .select("id")
    .single();

  if (insertErr || !newClient) {
    return { error: insertErr?.message ?? "Could not create client" };
  }

  revalidatePath("/dashboard/clients");
  return { ok: true, id: newClient.id };
}
