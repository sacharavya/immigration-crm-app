"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { graphFetch } from "@/lib/graph/client";
import { uploadFile } from "@/lib/graph/uploads";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";
import {
  MILESTONE_LABEL,
  MILESTONE_STATUS,
  nextMilestones,
  type CaseStatus,
  type Milestone,
} from "@/lib/utils/phase";
import { paymentSchema } from "@/lib/validators/payment";

const MILESTONE_VALUES = Object.keys(MILESTONE_STATUS) as [Milestone, ...Milestone[]];

type CaseUpdate = Database["crm"]["Tables"]["cases"]["Update"];

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}

export type UploadDocumentResult =
  | { ok: true; documentId: string; sharepointWebUrl: string }
  | { error: string };

export async function uploadDocument(
  caseId: string,
  documentCode: string,
  formData: FormData,
): Promise<UploadDocumentResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  if (!z.string().min(1).max(50).safeParse(documentCode).success) {
    return { error: "Invalid document code" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };

  // Hard ceiling regardless of template overrides — Graph's small-file
  // upload endpoint caps at 4 MB. Bigger files would need the upload-session
  // flow, which we don't implement.
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }

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

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, client_id, service_template_id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };

  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "OneDrive folder hasn't been created for this case yet. Use 'Retry folder creation' on the OneDrive card first.",
    };
  }

  const { data: templateDoc } = await supabase
    .schema("ref")
    .from("template_documents")
    .select(
      `
        document_label,
        allowed_file_types,
        max_file_size_mb,
        group:checklist_groups(name)
      `,
    )
    .eq("service_template_id", caseRow.service_template_id)
    .eq("document_code", documentCode)
    .maybeSingle();
  if (!templateDoc) {
    return { error: "Document code is not part of this case's template." };
  }
  if (!templateDoc.group) {
    return {
      error: "Document group missing — checklist group reference is broken.",
    };
  }

  // Per-template override of the global mime allow-list. Falls back to the
  // default set when the template doesn't pin one.
  const allowed = templateDoc.allowed_file_types?.length
    ? new Set(templateDoc.allowed_file_types)
    : ALLOWED_MIME_TYPES_SET;
  if (!allowed.has(file.type)) {
    const human = templateDoc.allowed_file_types?.length
      ? templateDoc.allowed_file_types.join(", ")
      : ALLOWED_EXTENSIONS_HUMAN;
    return {
      error: `File type ${file.type || "unknown"} is not allowed for this document. Use ${human}.`,
    };
  }

  // Per-template size cap, clamped to the Graph small-upload ceiling.
  // Templates above the ceiling are an authoring mistake — log + clamp.
  if (templateDoc.max_file_size_mb !== null) {
    if (templateDoc.max_file_size_mb > 4) {
      console.warn(
        `template_document.max_file_size_mb=${templateDoc.max_file_size_mb} exceeds the 4MB Graph small-upload ceiling — clamping.`,
      );
    }
    const cap = Math.min(templateDoc.max_file_size_mb, 4) * 1024 * 1024;
    if (file.size > cap) {
      return {
        error: `File exceeds this document's ${Math.min(templateDoc.max_file_size_mb, 4)}MB limit (${formatBytesMb(file.size)} MB).`,
      };
    }
  }

  const category = { name: templateDoc.group.name };

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "GRAPH_DOCUMENT_LIBRARY_ID is not set" };

  // List children of the case folder once and find the matching category
  // subfolder. The list is captured here for the duration of this single
  // upload — no cross-call caching, just keep within the request.
  let categoryFolderId: string;
  try {
    const children = await graphFetch<{
      value: Array<{ id: string; name: string; folder?: object }>;
    }>(
      `/drives/${driveId}/items/${caseRow.sharepoint_folder_id}/children?$select=id,name,folder`,
    );
    const match = children.value.find(
      (c) => c.folder && c.name === category.name,
    );
    if (!match) {
      return {
        error: `Subfolder "${category.name}" not found inside the case folder. The folder structure may be incomplete — try "Retry folder creation".`,
      };
    }
    categoryFolderId = match.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Failed to list case folder: ${message}` };
  }

  const sanitizedOriginalName = sanitizeFileName(file.name);
  const uploadName = `${documentCode}_${sanitizedOriginalName}`;

  let uploadResponse: { id: string; name: string; webUrl: string; size: number };
  try {
    uploadResponse = await uploadFile(
      driveId,
      categoryFolderId,
      uploadName,
      file,
      file.type,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Upload to OneDrive failed: ${message}` };
  }

  // Existing versions: mark prior as superseded, compute next version.
  const { data: existing } = await supabase
    .schema("files")
    .from("documents")
    .select("id, version_number, status")
    .eq("case_id", caseId)
    .eq("document_code", documentCode)
    .is("deleted_at", null);

  const priorRows = existing ?? [];
  const maxVersion = priorRows.reduce(
    (m, d) => Math.max(m, d.version_number),
    0,
  );
  const nextVersion = maxVersion + 1;
  const priorId =
    priorRows.length > 0
      ? priorRows.reduce((latest, d) =>
          d.version_number > latest.version_number ? d : latest,
        ).id
      : null;

  if (priorRows.length > 0) {
    const idsToSupersede = priorRows
      .filter((d) => d.status !== "superseded")
      .map((d) => d.id);
    if (idsToSupersede.length > 0) {
      await supabase
        .schema("files")
        .from("documents")
        .update({ status: "superseded" })
        .in("id", idsToSupersede);
    }
  }

  // CICC audit-trail note: the OneDrive audit log will record every upload
  // as the shared OneDrive owner (info@bigbangimmigration.com), since the
  // app uses an app-only Graph token against that shared mailbox. The
  // legally meaningful per-staff attribution is captured here in
  // uploaded_by_staff and in the case_event below.
  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseId,
      client_id: caseRow.client_id,
      document_code: documentCode,
      display_name: templateDoc.document_label,
      // files.documents.category is a denormalised label kept for legacy
      // queries; populate it with the checklist group name.
      category: category.name,
      sharepoint_drive_id: driveId,
      sharepoint_item_id: uploadResponse.id,
      sharepoint_web_url: uploadResponse.webUrl,
      file_name: uploadName,
      file_size_bytes: file.size,
      mime_type: file.type,
      status: "uploaded",
      version_number: nextVersion,
      supersedes: priorId,
      uploaded_by_staff: staff.id,
      uploaded_by_client: false,
    })
    .select("id")
    .single();

  if (insertErr || !newDoc) {
    return {
      error: `Could not record document: ${insertErr?.message ?? "unknown"}`,
    };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "document_received",
      event_data: {
        document_code: documentCode,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
      },
      description: `Document received: ${templateDoc.document_label} (v${nextVersion})`,
      visible_to_client: false,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return {
    ok: true,
    documentId: newDoc.id,
    sharepointWebUrl: uploadResponse.webUrl,
  };
}

export type RecordPaymentResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

/**
 * Record a payment against a case. Refunds are out of scope for v1, so
 * is_refund is hard-coded to false. Closed cases are rejected.
 */
export async function recordPayment(
  caseId: string,
  payload: unknown,
): Promise<RecordPaymentResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }

  const parsed = paymentSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<
      string,
      string[]
    >;
    return { error: "Please fix the errors below.", fieldErrors };
  }

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
    .select("id, client_id, status")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (caseErr || !caseRow) return { error: caseErr?.message ?? "Case not found" };
  if (caseRow.status === "closed") {
    return { error: "Cannot record a payment on a closed case." };
  }

  const { data: payment, error: payErr } = await supabase
    .schema("crm")
    .from("payments")
    .insert({
      case_id: caseId,
      client_id: caseRow.client_id,
      amount_cad: parsed.data.amountCad,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      received_date: parsed.data.receivedDate,
      notes: parsed.data.notes ?? null,
      is_refund: false,
      recorded_by: staff.id,
    })
    .select("id")
    .single();

  if (payErr || !payment) {
    return { error: payErr?.message ?? "Could not record payment" };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "fee_collected",
      event_data: {
        amount_cad: parsed.data.amountCad,
        method: parsed.data.method,
        payment_id: payment.id,
      },
      description: `Payment recorded: $${parsed.data.amountCad} via ${parsed.data.method}`,
      visible_to_client: false,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

const assignmentSchema = z.object({
  caseId: z.string().uuid(),
  // Legacy column name in the DB; UI now exposes a single "Assigned" slot.
  rcicId: z.string().uuid("Pick a staff member"),
});

export type UpdateAssignmentInput = z.infer<typeof assignmentSchema>;
export type UpdateAssignmentResult = { ok: true } | { error: string };

export async function updateAssignment(
  input: UpdateAssignmentInput,
): Promise<UpdateAssignmentResult> {
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, rcicId } = parsed.data;

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) {
    return { error: "You don't have permission to change assignments." };
  }

  const supabase = await createClient();

  const { data: caseRow, error: loadErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("assigned_rcic")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (loadErr || !caseRow) {
    return { error: loadErr?.message ?? "Case not found" };
  }

  // Verify the chosen staff member is still active.
  const { data: assignee } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_active, deleted_at")
    .eq("id", rcicId)
    .maybeSingle();
  if (!assignee || assignee.deleted_at || !assignee.is_active) {
    return { error: "Selected staff member is not active." };
  }

  if (caseRow.assigned_rcic === rcicId) {
    return { ok: true };
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("cases")
    .update({ assigned_rcic: rcicId })
    .eq("id", caseId);

  if (updateErr) return { error: updateErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { from: caseRow.assigned_rcic, to: rcicId },
      description: "Assignment updated",
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ============================================================================
// recordEvent — event-driven phase advancement
// ============================================================================
//
// Staff record a real-world milestone ("Submitted to IRCC", "Biometrics
// done", "IRCC decision: passport requested"). The status is derived from
// the milestone via MILESTONE_STATUS (defined in src/lib/utils/phase.ts).
// crm.can_advance_phase() still enforces the payment gate, and the
// matching lifecycle timestamp (submitted_at / decided_at / closed_at) is
// stamped on cases. The case_events row carries occurred_at (the date the
// user picked, not the moment-of-edit) plus event_data.milestone.

const recordEventSchema = z.object({
  caseId: z.string().uuid(),
  milestone: z.enum(MILESTONE_VALUES),
  // ISO 8601 instant or null. Defaults to "now" server-side.
  occurredAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export type RecordEventInput = z.infer<typeof recordEventSchema>;
export type RecordEventResult =
  | { ok: true }
  | { error: string; gateBlocked?: boolean };

export async function recordEvent(
  input: RecordEventInput,
): Promise<RecordEventResult> {
  const parsed = recordEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, milestone, occurredAt, note } = parsed.data;
  const targetStatus: CaseStatus = MILESTONE_STATUS[milestone];

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
    .select("status")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (caseErr || !caseRow) {
    return { error: caseErr?.message ?? "Case not found" };
  }

  // Defence in depth — UI only offers nextMilestones(currentStatus); reject
  // any milestone that doesn't fit the current state.
  const allowed = nextMilestones(caseRow.status);
  if (!allowed.includes(milestone)) {
    return {
      error: `'${MILESTONE_LABEL[milestone]}' is not a valid next step from the current status.`,
    };
  }

  // Payment gate (crm.can_advance_phase). Returns one row {allowed, reason}.
  const { data: gateRows, error: gateErr } = await supabase
    .schema("crm")
    .rpc("can_advance_phase", {
      p_case_id: caseId,
      p_target_status: targetStatus,
    });
  if (gateErr) return { error: gateErr.message };
  const gate = Array.isArray(gateRows) ? gateRows[0] : gateRows;
  if (!gate?.allowed) {
    return {
      error: gate?.reason ?? "Phase advancement blocked",
      gateBlocked: true,
    };
  }

  const occurred = occurredAt ?? new Date().toISOString();
  const updates: CaseUpdate = { status: targetStatus };
  switch (targetStatus) {
    case "submitted_to_ircc":
      updates.submitted_at = occurred;
      break;
    case "passport_requested":
    case "refused":
    case "additional_info_requested":
      updates.decided_at = occurred;
      break;
    case "closed":
      updates.closed_at = occurred;
      break;
  }

  if (caseRow.status !== targetStatus) {
    const { error: updateErr } = await supabase
      .schema("crm")
      .from("cases")
      .update(updates)
      .eq("id", caseId);
    if (updateErr) return { error: updateErr.message };
  }

  const description = note?.trim()
    ? `${MILESTONE_LABEL[milestone]} — ${note.trim()}`
    : MILESTONE_LABEL[milestone];

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "status_changed",
      event_data: {
        milestone,
        from: caseRow.status,
        to: targetStatus,
      },
      description,
      occurred_at: occurred,
      created_by: staff.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteCase (PERM-1)
//
// Hard delete a case. super_user only — gated here and by the
// crm.cases delete RLS policy from migration 20260501000005, tightened
// by 20260502000007 and given proper cascades by 20260503000005.
//
// On delete, the following children cascade with the case automatically:
//   case_events, communications, case_participants, tasks,
//   files.documents, retainer_agreements
//
// Invoices and payments do NOT cascade — they're financial records.
// Staff must void or reassign those before deleting the case.
// ---------------------------------------------------------------------------

export async function deleteCase(
  caseId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "delete_cases")) {
    return { error: "Only a super user can permanently delete a case." };
  }

  const supabase = await createClient();

  // Refuse if any financial record references this case. Better to
  // surface a clear message than let Postgres throw a raw FK violation.
  const [invoiceCount, paymentCount] = await Promise.all([
    supabase
      .schema("crm")
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .is("deleted_at", null),
    supabase
      .schema("crm")
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("case_id", caseId)
      .is("deleted_at", null),
  ]);
  const invoices = invoiceCount.count ?? 0;
  const payments = paymentCount.count ?? 0;
  if (invoices > 0 || payments > 0) {
    const parts: string[] = [];
    if (invoices > 0) parts.push(`${invoices} invoice${invoices === 1 ? "" : "s"}`);
    if (payments > 0) parts.push(`${payments} payment${payments === 1 ? "" : "s"}`);
    return {
      error: `Cannot delete: this case has ${parts.join(" and ")} on file. Void or reassign those first.`,
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("cases")
    .delete()
    .eq("id", caseId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/cases");
  revalidatePath("/dashboard");
  return { ok: true };
}
