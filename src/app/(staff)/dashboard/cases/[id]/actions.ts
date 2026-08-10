"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { tryAutoAdvanceFromRetainerPending } from "@/lib/cases/auto-advance";
import {
  sendCaseDecisionEmail,
  sendCaseEventEmail,
  sendCasePhaseAdvanceEmail,
} from "@/lib/email/case-notifications";
import { sendEmail, type EmailAttachment } from "@/lib/email/client";
import { logEmail } from "@/lib/email/log";
import { shouldRateLimit } from "@/lib/email/rate-limit";
import { casePaymentRequestEmail } from "@/lib/email/templates/case-payment-request";
import { clientUploadInviteEmail } from "@/lib/email/templates/client-upload-invite";
import { getBaseUrl } from "@/lib/email/url";
import { enqueueAndAttemptRejectedMove } from "@/lib/files/rejected-move";
import {
  ensureCaseCategoryFolder,
  ensureCasePaymentsFolder,
} from "@/lib/graph/folders";
import { uploadFile as graphUploadFile } from "@/lib/graph/uploads";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { immigrationStatusFromServiceType } from "@/lib/validators/client-immigration";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";
import {
  MILESTONE_LABEL,
  MILESTONE_STATUS,
  PHASE_LABELS,
  nextMilestones,
  phaseIndex,
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

// ---------------------------------------------------------------------------
// Filename rules for the new file-group versioning model (Increment 1+).
//
// v1   : <documentCode>_<sanitizedOriginal>            (clean, no version)
// v>=2 : <documentCode>_<sanitizedOriginal>_v<N>       (suffix before ext)
//
// The version number is the DB source of truth (files.documents.version_
// number). The filename merely echoes it for OneDrive readability and is
// never parsed back out.
// ---------------------------------------------------------------------------
function composeFileName(
  documentCode: string,
  originalName: string,
  version: number,
): string {
  const base = `${documentCode}_${sanitizeFileName(originalName)}`;
  if (version <= 1) return base;
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === base.length - 1) {
    return `${base}_v${version}`;
  }
  return `${base.slice(0, lastDot)}_v${version}${base.slice(lastDot)}`;
}

type UploadContext = {
  caseRow: {
    id: string;
    client_id: string;
    sharepoint_folder_id: string;
  };
  templateDoc: {
    document_label: string;
  };
  categoryName: string;
  categoryFolderId: string;
  driveId: string;
};

// Loads the case + template + category folder and validates the file
// against the template's per-doc constraints. Shared between uploadFile
// (fresh) and reuploadFile (re-upload) since both need the same context
// even though they differ in versioning behaviour.
async function resolveUploadContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  caseId: string,
  documentCode: string,
  file: File,
): Promise<
  { ok: true; ctx: UploadContext } | { ok: false; error: string }
> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, client_id, service_template_id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { ok: false, error: "Case not found" };
  if (!caseRow.sharepoint_folder_id) {
    return {
      ok: false,
      error:
        "Documents folder is still being created — please try again in a few seconds.",
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
    return {
      ok: false,
      error: "Document code is not part of this case's template.",
    };
  }
  if (!templateDoc.group) {
    return {
      ok: false,
      error: "Document group missing — checklist group reference is broken.",
    };
  }

  const allowed = templateDoc.allowed_file_types?.length
    ? new Set(templateDoc.allowed_file_types)
    : ALLOWED_MIME_TYPES_SET;
  if (!allowed.has(file.type)) {
    const human = templateDoc.allowed_file_types?.length
      ? templateDoc.allowed_file_types.join(", ")
      : ALLOWED_EXTENSIONS_HUMAN;
    return {
      ok: false,
      error: `File type ${file.type || "unknown"} is not allowed for this document. Use ${human}.`,
    };
  }

  if (templateDoc.max_file_size_mb !== null) {
    if (templateDoc.max_file_size_mb > 4) {
      console.warn(
        `template_document.max_file_size_mb=${templateDoc.max_file_size_mb} exceeds the 4MB Graph small-upload ceiling — clamping.`,
      );
    }
    const cap = Math.min(templateDoc.max_file_size_mb, 4) * 1024 * 1024;
    if (file.size > cap) {
      return {
        ok: false,
        error: `File exceeds this document's ${Math.min(templateDoc.max_file_size_mb, 4)}MB limit (${formatBytesMb(file.size)} MB).`,
      };
    }
  }

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    return { ok: false, error: "GRAPH_DOCUMENT_LIBRARY_ID is not set" };
  }

  // Self-healing: if the category subfolder doesn't exist (template
  // edited mid-case), ensureCaseCategoryFolder creates it lazily on
  // demand. Idempotent under 409 races.
  let categoryFolderId: string;
  try {
    const { folderItemId } = await ensureCaseCategoryFolder(
      caseRow.sharepoint_folder_id,
      templateDoc.group.name,
    );
    categoryFolderId = folderItemId;
  } catch (err) {
    console.error(
      "[resolveUploadContext] ensureCaseCategoryFolder failed:",
      err,
    );
    return {
      ok: false,
      error:
        "This case's OneDrive folder isn't ready. An admin needs to re-provision the case folder before uploads can proceed.",
    };
  }

  return {
    ok: true,
    ctx: {
      caseRow: {
        id: caseRow.id,
        client_id: caseRow.client_id,
        sharepoint_folder_id: caseRow.sharepoint_folder_id,
      },
      templateDoc: { document_label: templateDoc.document_label },
      categoryName: templateDoc.group.name,
      categoryFolderId,
      driveId,
    },
  };
}

/**
 * uploadFile — fresh upload, version 1, new file_group_key.
 *
 * Used for the first upload on a checklist slot AND for sibling files
 * when the template's expected_quantity > 1. The DB column DEFAULT
 * (gen_random_uuid) fills file_group_key automatically.
 *
 * Refuses if a live row already exists on the slot — under the new
 * invariant the only path to v(N>1) is reuploadFile against a rejected
 * row. The wrapper uploadDocument below dispatches automatically; the
 * Inc 4 UI will call this directly for sibling additions.
 */
export async function uploadFile(
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

  const ctxRes = await resolveUploadContext(
    supabase,
    caseId,
    documentCode,
    file,
  );
  if (!ctxRes.ok) return { error: ctxRes.error };
  const { ctx } = ctxRes;

  const uploadName = composeFileName(documentCode, file.name, 1);

  let uploadResponse: {
    id: string;
    name: string;
    webUrl: string;
    size: number;
  };
  try {
    uploadResponse = await graphUploadFile(
      ctx.driveId,
      ctx.categoryFolderId,
      uploadName,
      file,
      file.type,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Upload to OneDrive failed: ${message}` };
  }

  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseId,
      client_id: ctx.caseRow.client_id,
      document_code: documentCode,
      display_name: ctx.templateDoc.document_label,
      category: ctx.categoryName,
      sharepoint_drive_id: ctx.driveId,
      sharepoint_item_id: uploadResponse.id,
      sharepoint_web_url: uploadResponse.webUrl,
      file_name: uploadName,
      file_size_bytes: file.size,
      mime_type: file.type,
      status: "uploaded",
      version_number: 1,
      // file_group_key omitted; DB default fills a fresh UUID.
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
        version_number: 1,
        file_name: uploadName,
      },
      description: `Document received: ${ctx.templateDoc.document_label} (v1)`,
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

/**
 * reuploadFile — replaces a rejected file in-place with a new version.
 *
 * Strictly limited to slots whose current live row is status='rejected'.
 * Same file_group_key, version_number = prior + 1.
 *
 * ORDERING IS CRITICAL (Increment 1 migration comment):
 * the prior row must be flipped to 'superseded' BEFORE the new row is
 * inserted, or uniq_document_live_per_group rejects the INSERT.
 *
 * Sequence (do NOT reorder):
 *   1. Probe — find the live rejected row in this group. Captures
 *      case_id, document_code, version_number for filename + context.
 *   2. Graph upload — happens BEFORE the DB transition so a Graph
 *      failure leaves the prior 'rejected' row intact (and the slot
 *      still reflects the right state). Trade-off: a failed DB write
 *      between Graph success and our INSERT leaves a small OneDrive
 *      orphan that gets cleaned up by Inc 5's pending-moves cron.
 *   3. UPDATE ... RETURNING — flip rejected to superseded AND capture
 *      version_number atomically. Double precondition (status='rejected'
 *      AND version matches) defends against concurrent reuploads: the
 *      second caller finds no row and aborts.
 *   4. INSERT v(N+1) under the same file_group_key.
 *   5. Audit case_event. (Inc 5 will also enqueue a pending_drive_moves
 *      row here so the prior file is filed into Rejected/.)
 */
export async function reuploadFile(
  fileGroupKey: string,
  formData: FormData,
): Promise<UploadDocumentResult> {
  if (!z.string().uuid().safeParse(fileGroupKey).success) {
    return { error: "Invalid file group" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };

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

  // 1. Probe the group.
  const { data: live } = await supabase
    .schema("files")
    .from("documents")
    .select("id, case_id, client_id, document_code, version_number, status")
    .eq("file_group_key", fileGroupKey)
    .neq("status", "superseded")
    .is("deleted_at", null)
    .maybeSingle();
  if (!live) return { error: "File group not found" };
  if (!live.case_id) return { error: "File is not attached to a case." };
  if (!live.document_code) {
    return {
      error:
        "Cannot re-upload an additional document via this action.",
    };
  }
  if (live.status !== "rejected") {
    return {
      error: "Only rejected files can be re-uploaded. Refresh and try again.",
    };
  }

  const ctxRes = await resolveUploadContext(
    supabase,
    live.case_id,
    live.document_code,
    file,
  );
  if (!ctxRes.ok) return { error: ctxRes.error };
  const { ctx } = ctxRes;

  const nextVersion = live.version_number + 1;
  const uploadName = composeFileName(
    live.document_code,
    file.name,
    nextVersion,
  );

  // 2. Graph upload first. Failure here = no DB damage.
  let uploadResponse: {
    id: string;
    name: string;
    webUrl: string;
    size: number;
  };
  try {
    uploadResponse = await graphUploadFile(
      ctx.driveId,
      ctx.categoryFolderId,
      uploadName,
      file,
      file.type,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Upload to OneDrive failed: ${message}` };
  }

  // 3. UPDATE rejected -> superseded with double precondition. If
  //    another caller already re-uploaded between probe and now, our
  //    update matches no row and we abort. The OneDrive file is
  //    orphaned but harmless.
  const { data: superseded, error: updErr } = await supabase
    .schema("files")
    .from("documents")
    .update({ status: "superseded" })
    .eq("id", live.id)
    .eq("status", "rejected")
    .eq("version_number", live.version_number)
    .select(
      "id, version_number, sharepoint_drive_id, sharepoint_item_id, file_name",
    )
    .maybeSingle();

  if (updErr) {
    console.error("[reuploadFile] supersede update failed:", updErr);
    return {
      error:
        "Could not update prior version. The new file is in OneDrive but unrecorded — contact support.",
    };
  }
  if (!superseded) {
    return {
      error:
        "Another action changed this file. The new upload is in OneDrive but not linked. Refresh and try again.",
    };
  }

  // 4. INSERT v(N+1) under the same file_group_key.
  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: live.case_id,
      client_id: live.client_id,
      document_code: live.document_code,
      display_name: ctx.templateDoc.document_label,
      category: ctx.categoryName,
      sharepoint_drive_id: ctx.driveId,
      sharepoint_item_id: uploadResponse.id,
      sharepoint_web_url: uploadResponse.webUrl,
      file_name: uploadName,
      file_size_bytes: file.size,
      mime_type: file.type,
      status: "uploaded",
      version_number: nextVersion,
      file_group_key: fileGroupKey,
      supersedes: superseded.id,
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

  // 5. Audit.
  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: live.case_id,
      event_type: "document_received",
      event_data: {
        document_code: live.document_code,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
        supersedes_document_id: superseded.id,
      },
      description: `Document re-uploaded: ${ctx.templateDoc.document_label} (v${nextVersion})`,
      visible_to_client: false,
      created_by: staff.id,
    });

  // 6. Best-effort move of the now-superseded OneDrive item into
  //    "<group>/99 Rejected/" with a date-suffixed name. Enqueues +
  //    tries inline; failures get retried by the daily drive-moves
  //    cron. The DB is already authoritative — this only affects what
  //    staff sees when browsing OneDrive directly. Parent is the
  //    category folder (e.g. "01 Identity") so rejected files stay
  //    co-located with their active siblings.
  if (
    superseded.sharepoint_drive_id &&
    superseded.sharepoint_item_id &&
    superseded.file_name
  ) {
    await enqueueAndAttemptRejectedMove({
      supersededDocumentId: superseded.id,
      sourceDriveId: superseded.sharepoint_drive_id,
      sourceItemId: superseded.sharepoint_item_id,
      sourceFileName: superseded.file_name,
      parentFolderItemId: ctx.categoryFolderId,
    });
  }

  revalidatePath(`/dashboard/cases/${live.case_id}`);
  return {
    ok: true,
    documentId: newDoc.id,
    sharepointWebUrl: uploadResponse.webUrl,
  };
}

/**
 * uploadDocument — backward-compatible wrapper.
 *
 * Dispatches to uploadFile (fresh slot) or reuploadFile (rejected
 * slot). Refuses replacement when the slot already has a non-rejected
 * live row — under the new model, the only path to v>1 is through
 * 'rejected'. Inc 4's UI will call uploadFile / reuploadFile directly
 * and this wrapper will be retired.
 */
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

  const supabase = await createClient();

  // Same predicate as uniq_document_live_per_group: status != superseded
  // AND deleted_at IS NULL.
  const { data: live } = await supabase
    .schema("files")
    .from("documents")
    .select("file_group_key, status")
    .eq("case_id", caseId)
    .eq("document_code", documentCode)
    .neq("status", "superseded")
    .is("deleted_at", null)
    .maybeSingle();

  if (!live) {
    return uploadFile(caseId, documentCode, formData);
  }
  if (live.status === "rejected") {
    return reuploadFile(live.file_group_key, formData);
  }
  return {
    error:
      "A file is already filed in this slot. Reject the current upload before replacing it.",
  };
}

// ============================================================================
// FLOW-3d: uploadAdditionalDocument — upload against an ad-hoc IRCC-requested
// case_required_documents row (custom_label, document_code IS NULL). Mirrors
// uploadDocument minus the template lookup; the row's id is the link.
//
// OneDrive routing: files land in the case root folder (no category match
// since there's no template group). The filename is prefixed with the
// required-doc id so OneDrive listing stays distinct.
// ============================================================================

export async function uploadAdditionalDocument(
  caseId: string,
  requiredDocumentId: string,
  formData: FormData,
): Promise<UploadDocumentResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  if (!z.string().uuid().safeParse(requiredDocumentId).success) {
    return { error: "Invalid required document id" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }
  if (!ALLOWED_MIME_TYPES_SET.has(file.type)) {
    return {
      error: `File type ${file.type || "unknown"} is not allowed. Use ${ALLOWED_EXTENSIONS_HUMAN}.`,
    };
  }

  const supabase = await createClient();
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, client_id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "Documents folder is still being created — please try again in a few seconds.",
    };
  }

  // Confirm the required-doc row belongs to this case and is ad-hoc.
  const { data: reqDoc } = await supabase
    .schema("crm")
    .from("case_required_documents")
    .select("id, case_id, custom_label, requested_at_event_id")
    .eq("id", requiredDocumentId)
    .maybeSingle();
  if (!reqDoc || reqDoc.case_id !== caseId) {
    return { error: "Required document row not found for this case." };
  }
  if (!reqDoc.requested_at_event_id) {
    return {
      error:
        "This document is part of the Phase 2 checklist — use the regular upload action.",
    };
  }
  const displayName = reqDoc.custom_label ?? "Additional document";

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "GRAPH_DOCUMENT_LIBRARY_ID is not set" };

  const sanitizedOriginalName = sanitizeFileName(file.name);
  const uploadName = `additional_${requiredDocumentId.slice(0, 8)}_${sanitizedOriginalName}`;

  let uploadResponse: { id: string; name: string; webUrl: string; size: number };
  try {
    uploadResponse = await graphUploadFile(
      driveId,
      caseRow.sharepoint_folder_id,
      uploadName,
      file,
      file.type,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Upload to OneDrive failed: ${message}` };
  }

  // Supersede previous uploads for this required-doc row.
  const { data: existing } = await supabase
    .schema("files")
    .from("documents")
    .select("id, version_number, status")
    .eq("required_document_id", requiredDocumentId)
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

  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseId,
      client_id: caseRow.client_id,
      document_code: null,
      required_document_id: requiredDocumentId,
      display_name: displayName,
      category: "Additional",
      sharepoint_drive_id: driveId,
      sharepoint_item_id: uploadResponse.id,
      sharepoint_web_url: uploadResponse.webUrl,
      file_name: uploadName,
      file_size_bytes: file.size,
      mime_type: file.type,
      status: "uploaded",
      version_number: nextVersion,
      supersedes: priorId,
      uploaded_by_staff: me.id,
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
        required_document_id: requiredDocumentId,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
      },
      description: `Additional document received: ${displayName} (v${nextVersion})`,
      visible_to_client: false,
      created_by: me.id,
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

  // If this payment closed Phase 1's payment gate (retainer already
  // signed), the helper flips status to documentation_in_progress and
  // logs a system case_event. No-op when retainer isn't signed yet or
  // case is past Phase 1.
  await tryAutoAdvanceFromRetainerPending(supabase, caseId, staff.id);

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// attachPaymentProof — upload a receipt / screenshot for an existing payment.
// ---------------------------------------------------------------------------

const PROOF_ACCEPTED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
  "image/webp",
]);
const PROOF_MAX_BYTES = 10 * 1024 * 1024;

export type AttachPaymentProofResult =
  | { ok: true; documentId: string; webUrl: string | null }
  | { error: string };

export async function attachPaymentProof(
  paymentId: string,
  formData: FormData,
): Promise<AttachPaymentProofResult> {
  if (!z.string().uuid().safeParse(paymentId).success) {
    return { error: "Invalid payment id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "record_payments")) {
    return { error: "You don't have permission to manage payments." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > PROOF_MAX_BYTES) {
    return { error: "Proof must be under 10 MB" };
  }
  if (!PROOF_ACCEPTED_MIME.has(file.type)) {
    return { error: `Unsupported file type: ${file.type || "unknown"}` };
  }

  const supabase = await createClient();
  const { data: payment } = await supabase
    .schema("crm")
    .from("payments")
    .select("id, case_id, client_id, amount_cad, received_date, deleted_at")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.deleted_at) {
    return { error: "Payment not found" };
  }
  if (!payment.case_id) {
    return { error: "Payment has no case linked; cannot store proof." };
  }

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, sharepoint_folder_id")
    .eq("id", payment.case_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "OneDrive folder isn't provisioned for this case yet — retry folder creation first.",
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const safeBase =
    file.name.replace(/[\\/:*?"<>|]/g, "_").trim() ||
    `payment-${paymentId.slice(0, 8)}`;
  const fileName = `${payment.received_date}_${safeBase}`;

  let uploaded;
  try {
    const folder = await ensureCasePaymentsFolder(caseRow.sharepoint_folder_id);
    uploaded = await graphUploadFile(
      folder.driveId,
      folder.folderItemId,
      fileName,
      buffer,
      file.type,
    );

    const { data: doc, error: docErr } = await supabase
      .schema("files")
      .from("documents")
      .insert({
        case_id: payment.case_id,
        client_id: payment.client_id,
        category: "payment_proof",
        document_code: "PAYMENT_PROOF",
        display_name: `Payment proof — ${payment.received_date} ($${payment.amount_cad})`,
        file_name: fileName,
        file_size_bytes: file.size,
        mime_type: file.type,
        sharepoint_drive_id: folder.driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        status: "accepted",
        uploaded_by_staff: me.id,
      })
      .select("id")
      .single();
    if (docErr || !doc) {
      return { error: docErr?.message ?? "Could not record proof document" };
    }

    const { error: linkErr } = await supabase
      .schema("crm")
      .from("payments")
      .update({ proof_document_id: doc.id })
      .eq("id", paymentId);
    if (linkErr) return { error: linkErr.message };

    revalidatePath(`/dashboard/cases/${payment.case_id}`);
    return { ok: true, documentId: doc.id, webUrl: uploaded.webUrl };
  } catch (err) {
    console.error("[attachPaymentProof] upload failed:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Could not upload proof. Try again, or check OneDrive access.",
    };
  }
}

// ---------------------------------------------------------------------------
// removePaymentProof — clear the link without touching OneDrive (the
// blob remains for audit; staff can delete it from OneDrive directly).
// ---------------------------------------------------------------------------

export async function removePaymentProof(
  paymentId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(paymentId).success) {
    return { error: "Invalid payment id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "record_payments")) {
    return { error: "You don't have permission to manage payments." };
  }

  const supabase = await createClient();
  const { data: payment } = await supabase
    .schema("crm")
    .from("payments")
    .select("id, case_id, deleted_at")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.deleted_at) {
    return { error: "Payment not found" };
  }

  const { error } = await supabase
    .schema("crm")
    .from("payments")
    .update({ proof_document_id: null })
    .eq("id", paymentId);
  if (error) return { error: error.message };

  if (payment.case_id) {
    revalidatePath(`/dashboard/cases/${payment.case_id}`);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// reviewDocument — accept or reject the latest upload for a document
// slot. Only the latest version is reviewable; older versions are
// already 'superseded' (uploadDocument flips them on every reupload).
// Gated by review_documents.
// ---------------------------------------------------------------------------

const reviewSchema = z.discriminatedUnion("decision", [
  z.object({
    documentId: z.string().uuid(),
    decision: z.literal("accept"),
  }),
  z.object({
    documentId: z.string().uuid(),
    decision: z.literal("reject"),
    reason: z.string().trim().min(1, "Rejection reason is required").max(500),
  }),
]);

export type ReviewDocumentResult = { ok: true } | { error: string };

export async function reviewDocument(
  input: z.input<typeof reviewSchema>,
): Promise<ReviewDocumentResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "review_documents")) {
    return { error: "You don't have permission to review documents." };
  }

  const supabase = await createClient();

  // Single UPDATE with status precondition prevents double-review races:
  // two staff approving the same row simultaneously will see only one
  // UPDATE return a row; the other gets nothing and falls through to
  // the "already reviewed" branch. The precondition also collapses the
  // earlier "if superseded → error" check: a superseded row's status
  // isn't 'uploaded', so the UPDATE matches no row.
  const reviewedAt = new Date().toISOString();
  const decisionStatus =
    parsed.data.decision === "accept" ? "accepted" : "rejected";
  const rejectionReason =
    parsed.data.decision === "accept" ? null : parsed.data.reason;

  const { data: updated, error: updErr } = await supabase
    .schema("files")
    .from("documents")
    .update({
      status: decisionStatus,
      reviewed_by: me.id,
      reviewed_at: reviewedAt,
      rejection_reason: rejectionReason,
    })
    .eq("id", parsed.data.documentId)
    .eq("status", "uploaded")
    .is("deleted_at", null)
    .select(
      "id, case_id, document_code, display_name, version_number",
    )
    .maybeSingle();

  if (updErr) return { error: updErr.message };
  if (!updated) {
    return {
      error:
        "This file isn't awaiting review anymore. Refresh and check the latest status.",
    };
  }
  if (!updated.case_id) {
    return { error: "Document is not attached to a case." };
  }

  if (parsed.data.decision === "accept") {
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: updated.case_id,
        event_type: "document_accepted",
        event_data: {
          document_code: updated.document_code,
          document_id: updated.id,
          version_number: updated.version_number,
        },
        description: `Accepted: ${updated.display_name} (v${updated.version_number})`,
        created_by: me.id,
      });
  } else {
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: updated.case_id,
        event_type: "document_rejected",
        event_data: {
          document_code: updated.document_code,
          document_id: updated.id,
          version_number: updated.version_number,
          reason: parsed.data.reason,
        },
        description: `Rejected: ${updated.display_name} (v${updated.version_number}) — ${parsed.data.reason}`,
        created_by: me.id,
      });
  }

  revalidatePath(`/dashboard/cases/${updated.case_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// setCaseDocumentRequired — toggle a document slot's required flag for one
// case. Presence of a row in crm.case_required_documents = required.
// ---------------------------------------------------------------------------

const requiredDocSchema = z.object({
  caseId: z.string().uuid(),
  documentCode: z.string().min(1).max(100),
  isRequired: z.boolean(),
});

export type SetCaseDocumentRequiredResult =
  | { ok: true }
  | { error: string };

export async function setCaseDocumentRequired(
  input: z.input<typeof requiredDocSchema>,
): Promise<SetCaseDocumentRequiredResult> {
  const parsed = requiredDocSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "review_documents")) {
    return { error: "You don't have permission to change document requirements." };
  }

  const supabase = await createClient();

  // Confirm the case + the document slot are both real before any
  // write. The label lookup also feeds the audit-trail description.
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, service_template_id")
    .eq("id", parsed.data.caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };

  const { data: templateDoc } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("document_label")
    .eq("service_template_id", caseRow.service_template_id)
    .eq("document_code", parsed.data.documentCode)
    .maybeSingle();
  if (!templateDoc) {
    return {
      error: "That document slot doesn't exist on this case's template.",
    };
  }

  if (parsed.data.isRequired) {
    // Idempotent on; refreshes set_by / set_at if already present.
    const { error } = await supabase
      .schema("crm")
      .from("case_required_documents")
      .upsert(
        {
          case_id: parsed.data.caseId,
          document_code: parsed.data.documentCode,
          set_by: me.id,
          set_at: new Date().toISOString(),
        },
        { onConflict: "case_id,document_code" },
      );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .schema("crm")
      .from("case_required_documents")
      .delete()
      .eq("case_id", parsed.data.caseId)
      .eq("document_code", parsed.data.documentCode);
    if (error) return { error: error.message };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: parsed.data.caseId,
      event_type: "other",
      event_data: {
        kind: "doc_requirement_change",
        document_code: parsed.data.documentCode,
        to: parsed.data.isRequired,
      },
      description: `Marked ${templateDoc.document_label} as ${parsed.data.isRequired ? "Required" : "Optional"}.`,
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${parsed.data.caseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client portal link management — generate / revoke the per-case token
// used by the public /upload/[token] page. Audit captured by the
// audit.log_change trigger on crm.cases automatically.
// ---------------------------------------------------------------------------

export type GenerateClientPortalTokenResult =
  | { ok: true; token: string }
  | { error: string };

export async function generateClientPortalToken(
  caseId: string,
): Promise<GenerateClientPortalTokenResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "upload_documents")) {
    return { error: "You don't have permission to share this case." };
  }

  const supabase = await createClient();
  const token = randomUUID();
  const { data, error } = await supabase
    .schema("crm")
    .from("cases")
    .update({
      client_portal_token: token,
      client_portal_token_created_at: new Date().toISOString(),
    })
    .eq("id", caseId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Case not found" };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { kind: "client_portal_link_generated" },
      description: "Generated client upload link.",
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true, token };
}

// Send the upload link to the client by email. Pre-condition: a token
// must already exist on the case (call generateClientPortalToken first).
// The link itself is the same persistent token — the email is just a
// delivery channel; copy-paste still works.

const emailLinkSchema = z.object({
  caseId: z.string().uuid(),
  recipientEmail: z.string().email("Enter a valid email"),
  customMessage: z.string().trim().max(1000).optional(),
});

export type EmailClientPortalLinkResult =
  | { ok: true; emailSent: boolean; emailError?: string }
  | { error: string };

export async function emailClientPortalLink(
  input: z.input<typeof emailLinkSchema>,
): Promise<EmailClientPortalLinkResult> {
  const parsed = emailLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "upload_documents")) {
    return { error: "You don't have permission to share this case." };
  }

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, case_number, client_id, status, client_portal_token")
    .eq("id", parsed.data.caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (!caseRow.client_portal_token) {
    return {
      error: "Generate an upload link before emailing it.",
    };
  }
  // Refuse to email a link that the portal would treat as expired.
  if (
    !["retainer_pending", "documentation_in_progress", "documentation_review"].includes(
      caseRow.status,
    )
  ) {
    return {
      error:
        "This case is past the review phase — the link would land on an expired card.",
    };
  }

  const { data: client } = await supabase
    .schema("crm")
    .from("clients")
    .select("legal_name_full, given_names, preferred_name")
    .eq("id", caseRow.client_id)
    .maybeSingle();
  const clientName =
    client?.preferred_name?.trim() ||
    client?.given_names?.trim() ||
    client?.legal_name_full ||
    "there";

  const limited = await shouldRateLimit(
    "client_upload_invite",
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
  const uploadUrl = `${baseUrl}/upload/${caseRow.client_portal_token}`;
  const tpl = clientUploadInviteEmail({
    clientName,
    caseNumber: caseRow.case_number,
    uploadUrl,
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
    caseId: caseRow.id,
    clientId: caseRow.client_id,
    staffId: me.id,
    to: parsed.data.recipientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseRow.id,
      event_type: "other",
      event_data: {
        kind: "client_portal_link_emailed",
        recipient: parsed.data.recipientEmail,
        sent: res.ok,
      },
      description: res.ok
        ? `Emailed upload link to ${parsed.data.recipientEmail}.`
        : `Tried to email upload link to ${parsed.data.recipientEmail} — delivery failed.`,
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseRow.id}`);
  return {
    ok: true,
    emailSent: res.ok,
    emailError: res.ok ? undefined : res.error,
  };
}

export async function revokeClientPortalToken(
  caseId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "upload_documents")) {
    return { error: "You don't have permission to revoke this link." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("cases")
    .update({
      client_portal_token: null,
      client_portal_token_created_at: null,
    })
    .eq("id", caseId)
    .is("deleted_at", null);
  if (error) return { error: error.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { kind: "client_portal_link_revoked" },
      description: "Revoked client upload link.",
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ============================================================================
// Case team — RCIC of record + case worker(s)
//
// The team lives in crm.case_assignments (role enum 'rcic_of_record' |
// 'case_worker'). A DB trigger mirrors the rcic_of_record row back onto
// crm.cases.assigned_rcic so legacy readers (retainer / IRCC PDFs, the signing
// flow, reports, list filters) keep working untouched. Every action gates on
// edit_cases and records the change in the case audit trail (crm.case_events).
//
// Invariants enforced server-side (the UI also gates): the RCIC of record must
// be a licensed consultant, the RCIC of record cannot be cleared, and a case
// must keep at least one case worker.
// ============================================================================

export type TeamActionResult = { ok: true } | { error: string };

const setRcicSchema = z.object({
  caseId: z.string().uuid(),
  staffId: z.string().uuid("Pick a licensed consultant"),
});

async function loadEditableCase(
  caseId: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; meId: string }
  | { ok: false; error: string }
> {
  const me = await getStaff();
  if (!me) return { ok: false, error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) {
    return { ok: false, error: "You don't have permission to change the case team." };
  }
  const supabase = await createClient();
  const { data: caseRow, error: loadErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (loadErr || !caseRow) {
    return { ok: false, error: loadErr?.message ?? "Case not found" };
  }
  return { ok: true, supabase, meId: me.id };
}

export async function setRcicOfRecord(
  input: z.infer<typeof setRcicSchema>,
): Promise<TeamActionResult> {
  const parsed = setRcicSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, staffId } = parsed.data;

  const ctx = await loadEditableCase(caseId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, meId } = ctx;

  // The chosen staff member must be an active, flagged RCIC. The DB trigger
  // re-checks is_rcic, but a clear message beats a raw constraint error.
  const { data: rcic } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_rcic, is_active, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!rcic || rcic.deleted_at || !rcic.is_active) {
    return { error: "Selected staff member is not active." };
  }
  if (!rcic.is_rcic) {
    return { error: "The RCIC of record must be a licensed consultant (RCIC)." };
  }

  const { data: current } = await supabase
    .schema("crm")
    .from("case_assignments")
    .select("id, staff_id")
    .eq("case_id", caseId)
    .eq("role", "rcic_of_record")
    .maybeSingle();

  if (current?.staff_id === staffId) return { ok: true };

  const mutation = current
    ? supabase
        .schema("crm")
        .from("case_assignments")
        .update({ staff_id: staffId, created_by: meId })
        .eq("id", current.id)
    : supabase
        .schema("crm")
        .from("case_assignments")
        .insert({
          case_id: caseId,
          staff_id: staffId,
          role: "rcic_of_record",
          created_by: meId,
        });
  const { error: writeErr } = await mutation;
  if (writeErr) return { error: writeErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: {
        kind: "case_team",
        role: "rcic_of_record",
        from: current?.staff_id ?? null,
        to: staffId,
      },
      description: "RCIC of record changed",
      created_by: meId,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

const workerSchema = z.object({
  caseId: z.string().uuid(),
  staffId: z.string().uuid("Pick a staff member"),
});

export async function addCaseWorker(
  input: z.infer<typeof workerSchema>,
): Promise<TeamActionResult> {
  const parsed = workerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, staffId } = parsed.data;

  const ctx = await loadEditableCase(caseId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, meId } = ctx;

  const { data: worker } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_active, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!worker || worker.deleted_at || !worker.is_active) {
    return { error: "Selected staff member is not active." };
  }

  // Idempotent: a person already on the team as a worker is a no-op.
  const { data: existing } = await supabase
    .schema("crm")
    .from("case_assignments")
    .select("id")
    .eq("case_id", caseId)
    .eq("role", "case_worker")
    .eq("staff_id", staffId)
    .maybeSingle();
  if (existing) return { ok: true };

  const { error: writeErr } = await supabase
    .schema("crm")
    .from("case_assignments")
    .insert({
      case_id: caseId,
      staff_id: staffId,
      role: "case_worker",
      created_by: meId,
    });
  if (writeErr) return { error: writeErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { kind: "case_team", role: "case_worker", added: staffId },
      description: "Case worker added",
      created_by: meId,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

export async function removeCaseWorker(
  input: z.infer<typeof workerSchema>,
): Promise<TeamActionResult> {
  const parsed = workerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, staffId } = parsed.data;

  const ctx = await loadEditableCase(caseId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, meId } = ctx;

  const { data: workers } = await supabase
    .schema("crm")
    .from("case_assignments")
    .select("id, staff_id")
    .eq("case_id", caseId)
    .eq("role", "case_worker");

  const rows = workers ?? [];
  const target = rows.find((w) => w.staff_id === staffId);
  if (!target) {
    return { error: "That staff member is not a case worker on this case." };
  }
  if (rows.length <= 1) {
    return { error: "A case must keep at least one case worker." };
  }

  const { error: delErr } = await supabase
    .schema("crm")
    .from("case_assignments")
    .delete()
    .eq("id", target.id);
  if (delErr) return { error: delErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { kind: "case_team", role: "case_worker", removed: staffId },
      description: "Case worker removed",
      created_by: meId,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

const replaceWorkerSchema = z.object({
  caseId: z.string().uuid(),
  fromStaffId: z.string().uuid(),
  toStaffId: z.string().uuid("Pick a staff member"),
});

export async function replaceCaseWorker(
  input: z.infer<typeof replaceWorkerSchema>,
): Promise<TeamActionResult> {
  const parsed = replaceWorkerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, fromStaffId, toStaffId } = parsed.data;
  if (fromStaffId === toStaffId) return { ok: true };

  const ctx = await loadEditableCase(caseId);
  if (!ctx.ok) return { error: ctx.error };
  const { supabase, meId } = ctx;

  const { data: toStaff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_active, deleted_at")
    .eq("id", toStaffId)
    .maybeSingle();
  if (!toStaff || toStaff.deleted_at || !toStaff.is_active) {
    return { error: "Selected staff member is not active." };
  }

  const { data: workers } = await supabase
    .schema("crm")
    .from("case_assignments")
    .select("id, staff_id")
    .eq("case_id", caseId)
    .eq("role", "case_worker");

  const rows = workers ?? [];
  const fromRow = rows.find((w) => w.staff_id === fromStaffId);
  if (!fromRow) {
    return { error: "That staff member is not a case worker on this case." };
  }
  if (rows.some((w) => w.staff_id === toStaffId)) {
    return { error: "That staff member is already a case worker on this case." };
  }

  // Update the existing row in place: the worker count never changes, so the
  // last-worker invariant is preserved automatically.
  const { error: writeErr } = await supabase
    .schema("crm")
    .from("case_assignments")
    .update({ staff_id: toStaffId, created_by: meId })
    .eq("id", fromRow.id);
  if (writeErr) return { error: writeErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: {
        kind: "case_team",
        role: "case_worker",
        from: fromStaffId,
        to: toStaffId,
      },
      description: "Case worker changed",
      created_by: meId,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ============================================================================
// setCasePriority: the one manual field on the cases board
// ============================================================================
//
// Priority is the only board signal a human sets; everything else is derived.
// Levels: 'normal' (the default, shown as no pill), 'high', 'critical'. Never
// set automatically. Gated on edit_cases at the action level as defence in
// depth behind the UI.

const casePrioritySchema = z.object({
  caseId: z.string().uuid(),
  priority: z.enum(["normal", "high", "critical"]),
});

export type SetCasePriorityInput = z.infer<typeof casePrioritySchema>;
export type SetCasePriorityResult = { ok: true } | { error: string };

export async function setCasePriority(
  input: SetCasePriorityInput,
): Promise<SetCasePriorityResult> {
  const parsed = casePrioritySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, priority } = parsed.data;

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) {
    return { error: "You don't have permission to change case priority." };
  }

  const supabase = await createClient();

  const { data: caseRow, error: loadErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("priority")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (loadErr || !caseRow) {
    return { error: loadErr?.message ?? "Case not found" };
  }
  if ((caseRow.priority ?? "normal") === priority) {
    return { ok: true };
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("cases")
    .update({ priority })
    .eq("id", caseId);
  if (updateErr) return { error: updateErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "other",
      event_data: { from: caseRow.priority ?? "normal", to: priority },
      description: "Priority changed",
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseId}`);
  revalidatePath("/dashboard/cases");
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

export type RecordEventInput = z.infer<typeof recordEventSchema> & {
  notifyClient?: boolean;
  clientNote?: string | null;
  attachmentDocId?: string | null;
  attachmentFormData?: FormData;
  statusExpiry?: string | null; // YYYY-MM-DD, for approved decisions
};
export type RecordEventResult =
  | { ok: true; emailWarning?: string }
  | { error: string; gateBlocked?: boolean };

export async function recordEvent(
  input: RecordEventInput,
): Promise<RecordEventResult> {
  const parsed = recordEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { caseId, milestone, occurredAt, note } = parsed.data;
  const { notifyClient, clientNote, attachmentDocId, attachmentFormData, statusExpiry } = input;
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

  // Auto-populate client immigration status when a case is approved.
  // Looks up the service type code and maps it to an immigration status.
  if (targetStatus === "passport_requested") {
    const { data: approvedCase } = await supabase
      .schema("crm")
      .from("cases")
      .select("client_id, service_type_id")
      .eq("id", caseId)
      .maybeSingle();
    if (approvedCase?.service_type_id) {
      const { data: svcType } = await supabase
        .schema("ref")
        .from("service_types")
        .select("code, name, category_code")
        .eq("id", approvedCase.service_type_id)
        .maybeSingle();
      if (svcType) {
        const immStatus = immigrationStatusFromServiceType(svcType);
        if (immStatus && approvedCase.client_id) {
          await supabase
            .schema("crm")
            .from("clients")
            .update({
              immigration_status: immStatus,
              immigration_status_expiry: statusExpiry || null,
              immigration_status_note: `${svcType.name}`,
            } as never)
            .eq("id", approvedCase.client_id);
        }
      }
    }
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

  // Email notification. The case_event + status change are already
  // committed, so a failed email never rolls those back — but unlike before
  // we capture the result and surface it, so staff learn when a file (or the
  // whole email) didn't reach the client instead of silently "succeeding".
  let emailWarning: string | undefined;
  if (notifyClient) {
    // Build file attachments from the FormData upload. Supports multiple
    // files (getAll) — every non-empty File is attached.
    const attachments: EmailAttachment[] = [];
    if (attachmentFormData) {
      for (const entry of attachmentFormData.getAll("file")) {
        if (entry instanceof File && entry.size > 0) {
          const buffer = Buffer.from(await entry.arrayBuffer());
          attachments.push({ filename: entry.name, content: buffer });
        }
      }
    }
    const attachmentList = attachments.length > 0 ? attachments : undefined;

    const isDecision =
      targetStatus === "passport_requested" || targetStatus === "refused";

    const emailResult = isDecision
      ? await sendCaseDecisionEmail(
          supabase,
          caseId,
          targetStatus === "passport_requested" ? "approved" : "refused",
          {
            staffNote: clientNote ?? undefined,
            attachments: attachmentList,
            staffId: staff.id,
            attachmentDocId: attachmentDocId ?? undefined,
          },
        )
      : await (async () => {
          const fromPhase = phaseIndex(caseRow.status);
          const toPhase = phaseIndex(targetStatus);
          return sendCasePhaseAdvanceEmail(
            supabase,
            caseId,
            fromPhase ? PHASE_LABELS[fromPhase] : caseRow.status,
            toPhase ? PHASE_LABELS[toPhase] : targetStatus,
            {
              staffNote: clientNote ?? undefined,
              staffId: staff.id,
              attachments: attachmentList,
              attachmentDocId: attachmentDocId ?? undefined,
            },
          );
        })();

    if (!emailResult.ok) {
      emailWarning = `Event recorded, but the client email failed to send: ${emailResult.reason}`;
    } else if (emailResult.warning) {
      emailWarning = emailResult.warning;
    }
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true, emailWarning };
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

// ============================================================================
// FLOW-3b: recordCaseEvent — ad-hoc IRCC interactions + case-resolution events.
//
// Distinct from recordEvent() above, which is the milestone-driven phase
// advance dialog. This action handles events that update sub-status / the
// chip / biometrics tracking but do NOT advance the phase.
//
// Side effects per event type are listed inline. Side effects that fail
// after the case_event row is committed produce a soft inconsistency the
// user can fix via the biometrics-card "Edit status" action.
// ============================================================================

const recordCaseEventSchema = z.discriminatedUnion("event_type", [
  z.object({
    event_type: z.literal("biometrics_requested"),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    event_type: z.literal("biometrics_scheduled"),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location: z.string().max(200).optional(),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    event_type: z.literal("biometrics_completed"),
    completed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    location: z.string().max(200).optional(),
    bvn_or_reference: z.string().max(100).optional(),
    valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    create_client_record: z.boolean().default(true),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    event_type: z.literal("passport_requested"),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    event_type: z.literal("additional_info_requested"),
    what_ircc_asked_for: z.string().min(1).max(2000),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    occurred_at: z.string().datetime().optional(),
  }),
  z.object({
    event_type: z.literal("additional_info_submitted"),
    what_was_sent: z.string().min(1).max(2000),
    occurred_at: z.string().datetime().optional(),
  }),
  z.object({
    event_type: z.literal("interview_scheduled"),
    interview_date: z.string().datetime(),
    location: z.string().max(200).optional(),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    event_type: z.literal("interview_completed"),
    outcome: z.enum(["went_well", "concerns", "unsure"]).optional(),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    event_type: z.literal("application_returned"),
    reason_given: z.string().max(2000).optional(),
    occurred_at: z.string().datetime().optional(),
  }),
  z.object({
    event_type: z.literal("appeal_filed"),
    appeal_reference: z.string().max(100).optional(),
    occurred_at: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
  }),
  z.object({
    event_type: z.literal("withdrawal_requested"),
    reason: z.string().max(1000).optional(),
    occurred_at: z.string().datetime().optional(),
  }),
  z.object({
    event_type: z.literal("additional_documents_requested"),
    documents: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          due_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        }),
      )
      .min(1)
      .max(20),
    overall_due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z.string().max(2000).optional(),
    occurred_at: z.string().datetime().optional(),
  }),
]);

export type RecordCaseEventInput = z.infer<typeof recordCaseEventSchema>;
export type RecordCaseEventResult =
  | { ok: true; event_id: string; emailWarning?: string }
  | { error: string };

// Which statuses each event type is allowed from. Defence-in-depth — the
// dialog should hide invalid options, but the action also checks.
const EVENT_ALLOWED_FROM: Record<
  RecordCaseEventInput["event_type"],
  ReadonlyArray<CaseStatus>
> = {
  biometrics_requested: ["submitted_to_ircc"],
  biometrics_scheduled: ["submitted_to_ircc"],
  biometrics_completed: ["submitted_to_ircc"],
  passport_requested: ["submitted_to_ircc"],
  additional_info_requested: ["submitted_to_ircc"],
  additional_info_submitted: ["submitted_to_ircc"],
  interview_scheduled: ["submitted_to_ircc"],
  interview_completed: ["submitted_to_ircc"],
  application_returned: ["submitted_to_ircc"],
  appeal_filed: ["refused", "submitted_to_ircc"],
  withdrawal_requested: [
    "retainer_pending",
    "documentation_in_progress",
    "documentation_review",
    "submitted_to_ircc",
    "refused",
  ],
  additional_documents_requested: ["submitted_to_ircc"],
};

function eventAllowsStatus(
  evt: RecordCaseEventInput["event_type"],
  status: CaseStatus,
): boolean {
  return EVENT_ALLOWED_FROM[evt].includes(status);
}

export async function recordCaseEvent(
  caseId: string,
  payload: RecordCaseEventInput,
  emailOpts?: {
    notifyClient?: boolean;
    clientNote?: string;
    attachmentDocId?: string;
    attachmentFormData?: FormData;
  },
): Promise<RecordCaseEventResult> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  const parsed = recordCaseEventSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) {
    return { error: "Not allowed to record events on this case." };
  }

  const supabase = await createClient();
  const { data: caseRow, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, status, client_id, case_number, service_type_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (caseErr || !caseRow) return { error: "Case not found" };
  if (caseRow.status === "closed") {
    return { error: "Closed cases cannot have events recorded." };
  }
  if (!eventAllowsStatus(data.event_type, caseRow.status)) {
    return {
      error: `'${data.event_type}' isn't valid from the case's current status.`,
    };
  }

  const occurred = data.occurred_at ?? new Date().toISOString();
  const description = buildEventDescription(data);
  // Cast through the Supabase Json type — buildEventData returns a plain
  // record of string-keyed JSON-shaped values, but TS doesn't let us flow
  // `Record<string, unknown>` into a `Json` column without help.
  const eventData = buildEventData(data) as unknown as Database["crm"]["Tables"]["case_events"]["Insert"]["event_data"];

  // Insert the event first.
  const { data: inserted, error: insertErr } = await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: data.event_type,
      event_data: eventData,
      description,
      occurred_at: occurred,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return { error: insertErr?.message ?? "Could not record event" };
  }

  // Side effects per event type. Failures here are logged but don't roll
  // back the event row — the chip will still reflect the latest event,
  // and staff can correct via the biometrics-card "Edit status" action.
  if (data.event_type === "biometrics_requested") {
    await supabase
      .schema("crm")
      .from("cases")
      .update({ biometrics_status: "requested_by_ircc" })
      .eq("id", caseId);
  } else if (data.event_type === "biometrics_scheduled") {
    await supabase
      .schema("crm")
      .from("cases")
      .update({ biometrics_status: "scheduled" })
      .eq("id", caseId);
  } else if (data.event_type === "biometrics_completed") {
    await supabase
      .schema("crm")
      .from("cases")
      .update({ biometrics_status: "completed" })
      .eq("id", caseId);
    if (data.create_client_record !== false) {
      const validUntil =
        data.valid_until ??
        (() => {
          const d = new Date(`${data.completed_date}T00:00:00Z`);
          d.setUTCFullYear(d.getUTCFullYear() + 10);
          return d.toISOString().slice(0, 10);
        })();
      const { data: bioRecord } = await supabase
        .schema("crm")
        .from("client_biometric_records")
        .insert({
          client_id: caseRow.client_id,
          date_given: data.completed_date,
          location: data.location ?? null,
          bvn_or_reference: data.bvn_or_reference ?? null,
          valid_until: validUntil,
          application_context: `Case ${caseRow.case_number}`,
          created_by: me.id,
        })
        .select("id")
        .single();
      if (bioRecord?.id) {
        await supabase
          .schema("crm")
          .from("cases")
          .update({ biometrics_record_id: bioRecord.id })
          .eq("id", caseId);
      }
    }
  } else if (data.event_type === "additional_documents_requested") {
    // Insert one case_required_documents row per requested doc, linked to
    // this event. document_code stays null so the row is identified by
    // custom_label + id (matched by required_document_id on upload).
    const rows = data.documents.map((d) => ({
      case_id: caseId,
      document_code: null,
      custom_label: d.label,
      due_date: d.due_date ?? data.overall_due_date ?? null,
      requested_at_event_id: inserted.id,
      set_by: me.id,
    }));
    await supabase.schema("crm").from("case_required_documents").insert(rows);

    // Reactivate the public upload portal if its token is missing. We don't
    // rotate a still-valid token here — clients may already hold the URL.
    const { data: portalRow } = await supabase
      .schema("crm")
      .from("cases")
      .select("client_portal_token")
      .eq("id", caseId)
      .maybeSingle();
    if (!portalRow?.client_portal_token) {
      await supabase
        .schema("crm")
        .from("cases")
        .update({
          client_portal_token: randomUUID(),
          client_portal_token_created_at: new Date().toISOString(),
        })
        .eq("id", caseId);
    }
  }

  // Email notification. Captured (not fire-and-forget) so a failed send or a
  // file that couldn't be fetched is reported back to the dialog.
  let emailWarning: string | undefined;
  if (emailOpts?.notifyClient) {
    // Multiple uploaded files are supported via getAll("file").
    const attachments: EmailAttachment[] = [];
    if (emailOpts.attachmentFormData) {
      for (const entry of emailOpts.attachmentFormData.getAll("file")) {
        if (entry instanceof File && entry.size > 0) {
          const buffer = Buffer.from(await entry.arrayBuffer());
          attachments.push({ filename: entry.name, content: buffer });
        }
      }
    }

    const emailResult = await sendCaseEventEmail(supabase, caseId, data.event_type, {
      staffNote: emailOpts.clientNote ?? undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      staffId: me.id,
      attachmentDocId: emailOpts.attachmentDocId ?? undefined,
      scheduledDate:
        "scheduled_date" in data ? (data.scheduled_date as string) : undefined,
      location: "location" in data ? (data.location as string) : undefined,
      whatWasAsked:
        "what_ircc_asked_for" in data
          ? (data.what_ircc_asked_for as string)
          : undefined,
      documentList:
        "documents" in data && Array.isArray(data.documents)
          ? (data.documents as { label: string }[]).map((d) => d.label)
          : undefined,
      dueDate:
        "due_date" in data
          ? (data.due_date as string)
          : "overall_due_date" in data
            ? (data.overall_due_date as string)
            : undefined,
    });

    if (!emailResult.ok) {
      emailWarning = `Event recorded, but the client email failed to send: ${emailResult.reason}`;
    } else if (emailResult.warning) {
      emailWarning = emailResult.warning;
    }
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true, event_id: inserted.id, emailWarning };
}

function buildEventDescription(data: RecordCaseEventInput): string {
  switch (data.event_type) {
    case "biometrics_requested":
      return "IRCC requested biometrics";
    case "biometrics_scheduled":
      return `Biometrics scheduled for ${data.scheduled_date}${
        data.location ? ` at ${data.location}` : ""
      }`;
    case "biometrics_completed":
      return `Biometrics completed on ${data.completed_date}`;
    case "passport_requested":
      return "IRCC issued a passport request (PPR)";
    case "additional_info_requested":
      return `IRCC requested additional information: ${data.what_ircc_asked_for.slice(0, 140)}`;
    case "additional_info_submitted":
      return `Additional information submitted to IRCC`;
    case "interview_scheduled":
      return `Interview scheduled for ${new Date(data.interview_date).toISOString().slice(0, 10)}${
        data.location ? ` at ${data.location}` : ""
      }`;
    case "interview_completed":
      return `Interview completed${data.outcome ? ` (${data.outcome.replace("_", " ")})` : ""}`;
    case "application_returned":
      return `Application returned by IRCC`;
    case "appeal_filed":
      return `Appeal filed${data.appeal_reference ? ` (${data.appeal_reference})` : ""}`;
    case "withdrawal_requested":
      return `Client requested withdrawal`;
    case "additional_documents_requested": {
      const count = data.documents.length;
      const names = data.documents
        .map((d) => d.label)
        .slice(0, 3)
        .join(", ");
      const suffix = data.documents.length > 3 ? ", and more" : "";
      const due = data.overall_due_date
        ? ` Due ${data.overall_due_date}.`
        : "";
      return `IRCC requested ${count} additional document${count === 1 ? "" : "s"}: ${names}${suffix}.${due}`;
    }
  }
}

function buildEventData(
  data: RecordCaseEventInput,
): Record<string, unknown> {
  switch (data.event_type) {
    case "biometrics_requested":
      return {};
    case "biometrics_scheduled":
      return {
        scheduled_date: data.scheduled_date,
        ...(data.location ? { location: data.location } : {}),
      };
    case "biometrics_completed":
      return {
        completed_date: data.completed_date,
        ...(data.location ? { location: data.location } : {}),
        ...(data.bvn_or_reference
          ? { bvn_or_reference: data.bvn_or_reference }
          : {}),
        ...(data.valid_until ? { valid_until: data.valid_until } : {}),
      };
    case "passport_requested":
      return data.notes ? { notes: data.notes } : {};
    case "additional_info_requested":
      return {
        what_ircc_asked_for: data.what_ircc_asked_for,
        ...(data.due_date ? { due_date: data.due_date } : {}),
      };
    case "additional_info_submitted":
      return { what_was_sent: data.what_was_sent };
    case "interview_scheduled":
      return {
        interview_date: data.interview_date,
        ...(data.location ? { location: data.location } : {}),
      };
    case "interview_completed":
      return data.outcome ? { outcome: data.outcome } : {};
    case "application_returned":
      return data.reason_given ? { reason_given: data.reason_given } : {};
    case "appeal_filed":
      return data.appeal_reference
        ? { appeal_reference: data.appeal_reference }
        : {};
    case "withdrawal_requested":
      return data.reason ? { reason: data.reason } : {};
    case "additional_documents_requested":
      return {
        documents: data.documents,
        ...(data.overall_due_date
          ? { overall_due_date: data.overall_due_date }
          : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      };
  }
}

// ---------------------------------------------------------------------------
// updateCaseBiometricsStatus — manual override for the biometrics card.
// ---------------------------------------------------------------------------

const BIOMETRICS_STATUS_VALUES = [
  "not_applicable",
  "previously_given_valid",
  "previously_given_expired",
  "pending",
  "requested_by_ircc",
  "scheduled",
  "completed",
  "exempt",
] as const;

export async function updateCaseBiometricsStatus(
  caseId: string,
  status: (typeof BIOMETRICS_STATUS_VALUES)[number],
  recordId?: string | null,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  if (!BIOMETRICS_STATUS_VALUES.includes(status)) {
    return { error: "Invalid biometrics status" };
  }
  if (recordId && !z.string().uuid().safeParse(recordId).success) {
    return { error: "Invalid biometric record id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) return { error: "Not allowed." };

  const supabase = await createClient();
  const updates: {
    biometrics_status: (typeof BIOMETRICS_STATUS_VALUES)[number];
    biometrics_record_id?: string | null;
  } = { biometrics_status: status };
  if (recordId !== undefined) updates.biometrics_record_id = recordId;

  const { error } = await supabase
    .schema("crm")
    .from("cases")
    .update(updates)
    .eq("id", caseId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// linkBiometricRecord — pick an existing client biometric record and use it
// as the case's prior biometrics.
// ---------------------------------------------------------------------------

export async function linkBiometricRecord(
  caseId: string,
  recordId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  if (!z.string().uuid().safeParse(recordId).success) {
    return { error: "Invalid record id" };
  }
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "edit_cases")) return { error: "Not allowed." };

  const supabase = await createClient();
  const { data: record } = await supabase
    .schema("crm")
    .from("client_biometric_records")
    .select("id, valid_until")
    .eq("id", recordId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!record) return { error: "Biometric record not found" };

  const isValid =
    !record.valid_until ||
    new Date(record.valid_until) >= new Date(new Date().toISOString().slice(0, 10));
  const newStatus = isValid
    ? "previously_given_valid"
    : "previously_given_expired";

  const { error } = await supabase
    .schema("crm")
    .from("cases")
    .update({
      biometrics_status: newStatus,
      biometrics_record_id: recordId,
    })
    .eq("id", caseId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// notifyClientForPayment
//
// Staff-triggered: sends the client an email with Interac e-transfer
// instructions and a link to /pay/<token> where they can upload proof.
// Reuses the existing case client_portal_token so a single link covers
// both the document-upload portal and the pay portal (just different
// page paths).
//
// Refuses to send if the case balance is already paid in full — the
// case detail page's button is disabled in that state, but the action
// re-checks server-side because the dialog state could be stale.
// ---------------------------------------------------------------------------

// Same recipient address the appointment payment-pending email uses
// for consultations. Centralised so a future change picks both up.
const CASE_PAYMENT_RECIPIENT_EMAIL = "info@bigbangimmigration.com";

const notifyPaymentSchema = z.object({
  caseId: z.string().uuid(),
  recipientEmail: z.string().email("Enter a valid email"),
  customMessage: z.string().trim().max(1000).optional(),
});

export type NotifyClientForPaymentResult =
  | { ok: true; emailSent: boolean; emailError?: string }
  | { error: string };

export async function notifyClientForPayment(
  input: z.input<typeof notifyPaymentSchema>,
): Promise<NotifyClientForPaymentResult> {
  const parsed = notifyPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  // The "record_payments" perm is the right gate: anyone allowed to
  // accept staff-recorded payments is allowed to ask for one. Doesn't
  // need a separate permission flag.
  if (!staffCan(me, "record_payments")) {
    return {
      error: "You don't have permission to send a payment request.",
    };
  }

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, case_number, client_id, status, quoted_fee_cad, government_fee_cad, client_portal_token, client:clients(legal_name_full, given_names, preferred_name)",
    )
    .eq("id", parsed.data.caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (caseRow.status === "closed") {
    return { error: "Cannot request payment on a closed case." };
  }

  // Pull HST from the most recent SIGNED retainer. The retainer is
  // the canonical fee snapshot at signing; the cases table doesn't
  // store hst_cad directly. If no signed retainer exists yet (rare
  // for cases at the payment-request stage) we treat HST as zero —
  // staff will sign a retainer before collecting payment in practice.
  const { data: retainer } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("hst_cad, government_fee_cad")
    .eq("case_id", caseRow.id)
    .is("voided_at", null)
    .is("deleted_at", null)
    .not("signed_at", "is", null)
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Sum only VERIFIED payments. Unverified client uploads sit in
  // the pending bucket — until staff approves them they don't count
  // toward "paid" so the "Notify client for payment" button stays
  // enabled. (Previously the button disabled the moment a client
  // uploaded anything, letting bad uploads silently flip the case
  // to paid-in-full.)
  const { data: priorPayments } = await supabase
    .schema("crm")
    .from("payments")
    .select("amount_cad, client_uploaded_at, verified_at")
    .eq("case_id", caseRow.id)
    .is("deleted_at", null);
  const alreadyPaid = (priorPayments ?? []).reduce((sum, p) => {
    if (p.client_uploaded_at !== null && p.verified_at === null) {
      return sum;
    }
    return sum + Number(p.amount_cad);
  }, 0);
  const quoted = Number(caseRow.quoted_fee_cad);
  // Prefer the retainer's snapshotted government fee (it's what the
  // client signed) and fall back to the live case row when there's
  // no retainer yet.
  const governmentFee = Number(
    retainer?.government_fee_cad ?? caseRow.government_fee_cad ?? 0,
  );
  // Match the retainer document + payment card: default HST to 13% of the
  // pre-tax fee when unset (inside-Canada default). An explicit 0 (client
  // outside Canada) stays 0. Government fees are tax-exempt and added after.
  const hst =
    retainer?.hst_cad != null
      ? Number(retainer.hst_cad)
      : Math.round(quoted * 0.13 * 100) / 100;
  const totalDue = quoted + governmentFee + hst;
  const amountDue = Math.max(0, totalDue - alreadyPaid);
  if (amountDue <= 0) {
    return {
      error: "This case is paid in full — no payment to request.",
    };
  }

  // Ensure a portal token exists. Reusing the same column the
  // document-upload portal uses (case is the entity gating both).
  let token = caseRow.client_portal_token;
  if (!token) {
    token = randomUUID();
    const { error: updateErr } = await supabase
      .schema("crm")
      .from("cases")
      .update({
        client_portal_token: token,
        client_portal_token_created_at: new Date().toISOString(),
      })
      .eq("id", caseRow.id);
    if (updateErr) {
      return { error: `Could not issue portal token: ${updateErr.message}` };
    }
  }

  const clientName =
    caseRow.client?.preferred_name?.trim() ||
    caseRow.client?.given_names?.trim() ||
    caseRow.client?.legal_name_full ||
    "there";

  const limited = await shouldRateLimit(
    "case_payment_request",
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
  const payUrl = `${baseUrl}/pay/${token}`;
  const tpl = casePaymentRequestEmail({
    clientName,
    caseNumber: caseRow.case_number,
    amountDueCad: amountDue,
    quotedFeeCad: quoted,
    governmentFeeCad: governmentFee,
    hstCad: hst,
    totalDueCad: totalDue,
    alreadyPaidCad: alreadyPaid,
    recipientPaymentEmail: CASE_PAYMENT_RECIPIENT_EMAIL,
    referenceCode: caseRow.case_number,
    payUrl,
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
    caseId: caseRow.id,
    clientId: caseRow.client_id,
    staffId: me.id,
    to: parsed.data.recipientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseRow.id,
      event_type: "other",
      event_data: {
        kind: "case_payment_request_emailed",
        recipient: parsed.data.recipientEmail,
        amount_due_cad: amountDue,
        sent: res.ok,
      },
      description: res.ok
        ? `Emailed payment request ($${amountDue.toFixed(2)}) to ${parsed.data.recipientEmail}.`
        : `Tried to email payment request to ${parsed.data.recipientEmail} — delivery failed.`,
      created_by: me.id,
    });

  revalidatePath(`/dashboard/cases/${caseRow.id}`);
  return {
    ok: true,
    emailSent: res.ok,
    emailError: res.ok ? undefined : res.error,
  };
}
