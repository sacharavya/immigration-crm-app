"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { buildClientProfile } from "@/lib/forms/adapter";
import type { FormMapping } from "@/lib/forms/mapping";
import type { ApplicantProfile } from "@/lib/forms/profile";
import { ensureCaseFinalFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { requireStaffTenantId } from "@/lib/tenant/context";
import { createClient } from "@/lib/supabase/server";

// FORMS-4: server side of the Generate form action. The PDF itself is
// filled in the browser (client-side PDF policy); these actions supply the
// inputs and persist the output.

type Result<T> = ({ ok: true } & T) | { error: string };

export async function getFormFillOptions(caseId: string): Promise<
  Result<{
    participants: Array<{ id: string; name: string; role: string }>;
    forms: Array<{
      versionId: string;
      formNumber: string;
      title: string;
      versionLabel: string;
      matched: boolean;
    }>;
  }>
> {
  const me = await getStaff();
  if (!me || !staffCan(me, "view_cases")) return { error: "Not authorized" };

  const supabase = await createClient();
  const [{ data: caseRow }, { data: participants }, { data: forms }] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("cases")
        .select("id, service_type_id")
        .eq("id", caseId)
        .maybeSingle(),
      supabase
        .schema("crm")
        .from("case_participants")
        .select("id, role, client:clients(legal_name_full)")
        .eq("case_id", caseId),
      supabase
        .schema("crm")
        .from("forms")
        .select(
          "id, form_number, title, program_tags, is_active, form_versions(id, version_label, status)",
        )
        .eq("is_active", true),
    ]);
  if (!caseRow) return { error: "Case not found" };

  // The case's program vocabulary for ranking: service code + category.
  let caseTokens: string[] = [];
  if (caseRow.service_type_id) {
    const { data: svc } = await supabase
      .schema("ref")
      .from("service_types")
      .select("code, category_code")
      .eq("id", caseRow.service_type_id)
      .maybeSingle();
    caseTokens = [svc?.code, svc?.category_code]
      .filter(Boolean)
      .map((t) => String(t).toLowerCase());
  }

  const formRows = (forms ?? [])
    .map((f) => {
      const active = (f.form_versions ?? []).find(
        (v: { status: string }) => v.status === "active",
      );
      if (!active) return null;
      const tags = (f.program_tags ?? []).map((t: string) => t.toLowerCase());
      const matched = tags.some((t: string) =>
        caseTokens.some((c) => t.includes(c) || c.includes(t)),
      );
      return {
        versionId: active.id as string,
        formNumber: f.form_number as string,
        title: f.title as string,
        versionLabel: active.version_label as string,
        matched,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort(
      (a, b) =>
        Number(b.matched) - Number(a.matched) ||
        a.formNumber.localeCompare(b.formNumber),
    );

  return {
    ok: true,
    participants: (participants ?? []).map((p) => ({
      id: p.id,
      name: p.client?.legal_name_full ?? "Unknown",
      role: p.role,
    })),
    forms: formRows,
  };
}

export async function getFormFillPayload(
  versionId: string,
  participantId: string,
): Promise<
  Result<{
    mapping: FormMapping;
    formType: string;
    scope: string;
    formNumber: string;
    versionLabel: string;
    versionStatus: string;
    participantName: string;
    profile: ApplicantProfile;
    countryNames: Record<string, string>;
  }>
> {
  const me = await getStaff();
  if (!me || !staffCan(me, "edit_cases")) return { error: "Not authorized" };

  const supabase = await createClient();
  const [{ data: version }, { data: participant }, { data: countries }] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("form_versions")
        .select("id, version_label, status, mapping_json, form:forms(form_number, form_type, scope)")
        .eq("id", versionId)
        .maybeSingle(),
      supabase
        .schema("crm")
        .from("case_participants")
        .select("id, client_id, client:clients(legal_name_full)")
        .eq("id", participantId)
        .maybeSingle(),
      supabase.schema("ref").from("countries").select("code, name"),
    ]);
  if (!version?.form) return { error: "Form version not found" };
  if (!participant) return { error: "Participant not found" };

  const profile = await buildClientProfile(supabase, participant.client_id);

  return {
    ok: true,
    mapping: (version.mapping_json ?? {}) as FormMapping,
    formType: version.form.form_type,
    scope: version.form.scope,
    formNumber: version.form.form_number,
    versionLabel: version.version_label,
    versionStatus: version.status,
    participantName: participant.client?.legal_name_full ?? "Unknown",
    profile,
    countryNames: Object.fromEntries(
      (countries ?? []).map((c) => [c.code, c.name]),
    ),
  };
}

const saveSchema = z.object({
  form_version_id: z.string().uuid(),
  case_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  file_name: z.string().min(1).max(200),
  profile_snapshot: z.string().max(1_000_000),
  unmapped: z.string().max(200_000),
});

export async function saveFormFill(
  formData: FormData,
): Promise<Result<{ webUrl: string | null }>> {
  const me = await getStaff();
  if (!me || !staffCan(me, "edit_cases")) return { error: "Not authorized" };

  const parsed = saveSchema.safeParse({
    form_version_id: formData.get("form_version_id"),
    case_id: formData.get("case_id"),
    participant_id: formData.get("participant_id"),
    file_name: formData.get("file_name"),
    profile_snapshot: formData.get("profile_snapshot"),
    unmapped: formData.get("unmapped"),
  });
  if (!parsed.success) return { error: "Invalid input" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No filled PDF received" };
  }

  let snapshot: unknown;
  let unmapped: unknown;
  try {
    snapshot = JSON.parse(parsed.data.profile_snapshot);
    unmapped = JSON.parse(parsed.data.unmapped);
  } catch {
    return { error: "Invalid payload" };
  }

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, sharepoint_folder_id")
    .eq("id", parsed.data.case_id)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (!caseRow.sharepoint_folder_id) {
    return { error: "This case has no OneDrive folder yet." };
  }

  try {
    const { driveId, folderItemId } = await ensureCaseFinalFolder(
      await requireStaffTenantId(),
      
      caseRow.sharepoint_folder_id,
    );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await uploadFile(
      driveId,
      folderItemId,
      parsed.data.file_name,
      bytes,
      "application/pdf",
    );

    const { error } = await supabase
      .schema("crm")
      .from("form_fills")
      .insert({
        form_version_id: parsed.data.form_version_id,
        case_id: parsed.data.case_id,
        participant_id: parsed.data.participant_id,
        profile_snapshot_json: snapshot as never,
        sharepoint_drive_id: driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        file_name: uploaded.name,
        unmapped_fields: unmapped as never,
        generated_by: me.id,
      });
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/cases/${parsed.data.case_id}`);
    return { ok: true, webUrl: uploaded.webUrl ?? null };
  } catch (err) {
    console.error("[form-fill] save failed:", err);
    return { error: "Saving to OneDrive failed. Please try again." };
  }
}
