"use server";

import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createCaseFolderStructure } from "@/lib/graph/folders";
import { createClient } from "@/lib/supabase/server";
import { newCaseSchema, type NewCaseInput } from "@/lib/validators/case";

export type ClientSearchResult = {
  id: string;
  client_number: string;
  legal_name_full: string;
  email: string | null;
};

export async function searchClients(
  query: string,
): Promise<ClientSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // PostgREST .or() parses commas/parens — neutralise them in the user input.
  const safe = trimmed.replace(/[,()*]/g, " ");

  const supabase = await createClient();
  const { data } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, client_number, legal_name_full, email")
    .is("deleted_at", null)
    .or(`legal_name_full.ilike.%${safe}%,email.ilike.%${safe}%`)
    .limit(10);

  return data ?? [];
}

export type CreateCaseResult = { error: string };

export async function createCase(
  input: NewCaseInput,
): Promise<CreateCaseResult> {
  const parsed = newCaseSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first?.message ?? "Invalid input" };
  }

  // Defense in depth — the page already gates on this, but the action
  // can be called via any client and we don't want to rely on the UI.
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "create_cases")) {
    return { error: "You don't have permission to create cases." };
  }

  const supabase = await createClient();
  const staff = { id: me.id };

  // Resolve client_id (insert new if needed)
  let clientId: string;

  if (parsed.data.client_kind === "existing") {
    clientId = parsed.data.client_id;
  } else {
    const { data: clientNumber, error: numErr } = await supabase
      .schema("crm")
      .rpc("generate_client_number");
    if (numErr || !clientNumber) {
      return { error: `Could not generate client number: ${numErr?.message ?? "unknown"}` };
    }

    const nc = parsed.data.new_client;
    const { data: newClient, error: insertErr } = await supabase
      .schema("crm")
      .from("clients")
      .insert({
        client_number: clientNumber as unknown as string,
        legal_name_full: nc.legal_name_full,
        email: nc.email ?? null,
        phone_primary: nc.phone_primary ?? null,
        phone_whatsapp: nc.phone_whatsapp ?? null,
        country_of_citizenship: nc.country_of_citizenship ?? null,
        date_of_birth: nc.date_of_birth ?? null,
        status: "active",
        created_by: staff.id,
      })
      .select("id")
      .single();

    if (insertErr || !newClient) {
      return { error: `Could not create client: ${insertErr?.message ?? "unknown"}` };
    }
    clientId = newClient.id;
  }

  // Resolve the snapshot template via the SQL helper. Defensive against the
  // race where the variant was deactivated (or its template expired)
  // between the wizard load and submit.
  const { data: templateId, error: tplErr } = await supabase
    .schema("ref")
    .rpc("active_template_for_variant", {
      p_service_type_id: parsed.data.service_type_id,
    });

  if (tplErr) {
    return { error: `Could not resolve checklist: ${tplErr.message}` };
  }
  if (!templateId) {
    return {
      error:
        "Selected variant has no active checklist. Choose another variant.",
    };
  }
  const template = { id: templateId as string };

  // Generate case number
  const { data: caseNumber, error: caseNumErr } = await supabase
    .schema("crm")
    .rpc("generate_case_number");
  if (caseNumErr || !caseNumber) {
    return { error: `Could not generate case number: ${caseNumErr?.message ?? "unknown"}` };
  }

  // Insert case
  const { data: newCase, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .insert({
      case_number: caseNumber as unknown as string,
      client_id: clientId,
      service_type_id: parsed.data.service_type_id,
      service_template_id: template.id,
      assigned_rcic: staff.id,
      status: "retainer_pending",
      quoted_fee_cad: parsed.data.quoted_fee_cad,
      retainer_minimum_cad: parsed.data.retainer_minimum_cad ?? null,
      retained_at: parsed.data.retained_at
        ? new Date(parsed.data.retained_at).toISOString()
        : new Date().toISOString(),
      sharepoint_folder_id: null,
      sharepoint_folder_url: null,
      created_by: staff.id,
    })
    .select("id")
    .single();

  if (caseErr || !newCase) {
    return { error: `Could not create case: ${caseErr?.message ?? "unknown"}` };
  }

  // Record the opening event
  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: newCase.id,
      event_type: "status_changed",
      event_data: { from: null, to: "retainer_pending" },
      description: "Case opened",
      created_by: staff.id,
    });

  // The retainer_agreements row is created automatically by the
  // trg_ensure_retainer_for_new_case trigger (migration 20260503000006).
  // No app-side INSERT needed — the trigger is the single source of
  // truth and bypasses RLS, so it works regardless of caller role.

  // Once a client has a real case, they're no longer a lead. Flip the
  // status if it's still 'lead' (created via the standalone new-client
  // form). Existing 'active' / 'dormant' / 'closed' clients are left
  // alone — staff can change those by other means.
  const { data: existingClient } = await supabase
    .schema("crm")
    .from("clients")
    .select("status")
    .eq("id", clientId)
    .maybeSingle();
  if (existingClient?.status === "lead") {
    await supabase
      .schema("crm")
      .from("clients")
      .update({ status: "active" })
      .eq("id", clientId);
  }

  // Provision the OneDrive folder. Failures are recoverable — the row is
  // already committed, the user can retry from the case detail page, and
  // we leave a breadcrumb in case_events.
  let folderPending = false;
  try {
    const { driveItemId, webUrl } = await createCaseFolderStructure(newCase.id);
    await supabase
      .schema("crm")
      .from("cases")
      .update({
        sharepoint_folder_id: driveItemId,
        sharepoint_folder_url: webUrl,
      })
      .eq("id", newCase.id);
  } catch (err) {
    folderPending = true;
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[createCase] OneDrive folder provisioning failed for case ${newCase.id}:`,
      err,
    );
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: newCase.id,
        event_type: "other",
        event_data: { kind: "onedrive_folder_pending", error: message },
        description: "OneDrive folder creation failed; awaiting retry",
        created_by: staff.id,
      });
  }

  const path = `/dashboard/cases/${newCase.id}${folderPending ? "?folderPending=1" : ""}`;
  redirect(path);
}

/**
 * Retry OneDrive folder provisioning for a case where the initial
 * createCase() attempt failed. Safe to call repeatedly: returns
 * { ok: true } without doing any work if the folder already exists on
 * the case row. Records each attempt in case_events.
 */
export async function retryFolderCreation(
  caseId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: staff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!staff) return { error: "Active staff record not found" };

  const { data: caseRow, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (caseErr || !caseRow) {
    return { error: caseErr?.message ?? "Case not found" };
  }

  if (caseRow.sharepoint_folder_id) {
    return { ok: true };
  }

  try {
    const { driveItemId, webUrl } = await createCaseFolderStructure(caseId);

    await supabase
      .schema("crm")
      .from("cases")
      .update({
        sharepoint_folder_id: driveItemId,
        sharepoint_folder_url: webUrl,
      })
      .eq("id", caseId);

    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: caseId,
        event_type: "other",
        event_data: {
          kind: "onedrive_folder_retry_succeeded",
          driveItemId,
          webUrl,
        },
        description: "OneDrive folder created on retry",
        created_by: staff.id,
      });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[retryFolderCreation] failed for case ${caseId}:`,
      err,
    );

    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: caseId,
        event_type: "other",
        event_data: { kind: "onedrive_folder_retry_failed", error: message },
        description: "OneDrive folder retry failed",
        created_by: staff.id,
      });

    return { error: message };
  }
}
