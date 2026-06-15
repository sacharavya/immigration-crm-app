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

  // Derive first/last from the full legal name when staff left them
  // blank. The form surfaces this split inline so staff can override;
  // anything they typed wins over the derive.
  const derived = splitLegalName(parsed.data.legal_name_full);
  const given_names = parsed.data.given_names ?? derived.given_names;
  const family_name = parsed.data.family_name ?? derived.family_name;

  const { data: newClient, error: insertErr } = await supabase
    .schema("crm")
    .from("clients")
    .insert({
      client_number: clientNumber as unknown as string,
      legal_name_full: parsed.data.legal_name_full,
      preferred_name: parsed.data.preferred_name ?? null,
      given_names,
      family_name,
      date_of_birth: parsed.data.date_of_birth ?? null,
      gender: parsed.data.gender ?? null,
      marital_status: parsed.data.marital_status ?? null,
      country_of_birth: parsed.data.country_of_birth ?? null,
      country_of_citizenship: parsed.data.country_of_citizenship ?? null,
      country_of_residence: parsed.data.country_of_residence ?? null,
      preferred_language: parsed.data.preferred_language ?? null,
      preferred_contact: parsed.data.preferred_contact ?? null,
      email: parsed.data.email ?? null,
      phone_primary: parsed.data.phone_primary ?? null,
      phone_whatsapp: parsed.data.phone_whatsapp ?? null,
      address_line1: parsed.data.address_line1 ?? null,
      address_line2: parsed.data.address_line2 ?? null,
      city: parsed.data.city ?? null,
      province_state: parsed.data.province_state ?? null,
      postal_code: parsed.data.postal_code ?? null,
      country_code: parsed.data.country_code ?? null,
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
