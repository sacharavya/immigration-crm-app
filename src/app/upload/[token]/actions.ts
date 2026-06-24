"use server";

import { adminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

import { enqueueAndAttemptRejectedMove } from "@/lib/files/rejected-move";
import { ensureCaseCategoryFolder } from "@/lib/graph/folders";
import { uploadFile as graphUploadFile } from "@/lib/graph/uploads";
import {
  ALLOWED_EXTENSIONS_HUMAN,
  ALLOWED_MIME_TYPES_SET,
  MAX_UPLOAD_BYTES,
  formatBytesMb,
} from "@/lib/validators/document";

// Public client document upload. Mirrors the staff uploadDocument flow
// (versioning, supersedes, OneDrive category-folder routing) but runs
// against an unauthenticated request — auth is the case's
// client_portal_token + the case being in a pre-submission status.

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

// Statuses where the portal stays active for the original checklist.
// Once the case moves past documentation_review the original checklist
// is closed — but FLOW-3d carves out an exception: a case in
// submitted_to_ircc with open additional-document requests reopens the
// portal for those documents only (see loadCaseByPortalToken).
const ACTIVE_STATUSES = [
  "retainer_pending",
  "documentation_in_progress",
  "documentation_review",
] as const;


export type ClientPortalCase = {
  id: string;
  case_number: string;
  client_id: string;
  service_template_id: string;
  sharepoint_folder_id: string | null;
  status: string;
  // FLOW-3d: when the case is past Review, the portal only stays open if
  // additional documents have been requested. The page uses this flag to
  // hide the original Phase 2 checklist and show only the new docs.
  additional_docs_only: boolean;
};

export async function loadCaseByPortalToken(
  token: string,
): Promise<ClientPortalCase | null> {
  if (!TOKEN_RE.test(token)) return null;
  const supabase = adminClient();
  const { data } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, case_number, client_id, service_template_id, sharepoint_folder_id, status",
    )
    .eq("client_portal_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;

  if (
    ACTIVE_STATUSES.includes(data.status as (typeof ACTIVE_STATUSES)[number])
  ) {
    return { ...data, additional_docs_only: false };
  }

  // Past Review — only open if there are pending additional-doc requests.
  if (data.status === "submitted_to_ircc") {
    const { count } = await supabase
      .schema("crm")
      .from("case_required_documents")
      .select("id", { count: "exact", head: true })
      .eq("case_id", data.id)
      .not("requested_at_event_id", "is", null);
    if ((count ?? 0) > 0) {
      return { ...data, additional_docs_only: true };
    }
  }
  return null;
}

export type UploadAsClientResult =
  | { ok: true; documentId: string }
  | { error: string };

// ---------------------------------------------------------------------------
// Filename rules — match the staff side (see actions.ts:composeFileName).
//
// v1   : <documentCode>_<sanitizedOriginal>            (clean, no version)
// v>=2 : <documentCode>_<sanitizedOriginal>_v<N>       (suffix before ext)
//
// The old client-portal __v__ infix is retired. The DB
// version_number is the source of truth; filenames merely echo it.
// ---------------------------------------------------------------------------
function sanitizePortalFileName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/^[.\s]+|[.\s]+$/g, "")
      .trim() || ""
  );
}

function composePortalFileName(
  documentCode: string,
  originalName: string,
  version: number,
): string {
  const sanitized =
    sanitizePortalFileName(originalName) || `${documentCode}-v${version}`;
  const base = `${documentCode}_${sanitized}`;
  if (version <= 1) return base;
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === base.length - 1) {
    return `${base}_v${version}`;
  }
  return `${base.slice(0, lastDot)}_v${version}${base.slice(lastDot)}`;
}

type PortalUploadContext = {
  caseRow: ClientPortalCase;
  templateDoc: {
    document_label: string;
  };
  categoryName: string;
  categoryFolderId: string;
  driveId: string;
};

// Validates the file + loads the template + resolves the category folder.
// Shared between uploadFileAsClient (fresh) and reuploadFileAsClient
// (re-upload). The caller has already validated the portal token via
// loadCaseByPortalToken.
async function resolvePortalUploadContext(
  supabase: ReturnType<typeof adminClient>,
  caseRow: ClientPortalCase,
  documentCode: string,
  file: File,
): Promise<
  { ok: true; ctx: PortalUploadContext } | { ok: false; error: string }
> {
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
      error: "That document isn't part of your case checklist.",
    };
  }
  if (!templateDoc.group) {
    return {
      ok: false,
      error: "Document group missing. Please contact our office.",
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
      error: `File type ${file.type || "unknown"} is not allowed. Use ${human}.`,
    };
  }
  if (templateDoc.max_file_size_mb !== null) {
    const cap = Math.min(templateDoc.max_file_size_mb, 4) * 1024 * 1024;
    if (file.size > cap) {
      return {
        ok: false,
        error: `File exceeds the ${Math.min(templateDoc.max_file_size_mb, 4)}MB limit (${formatBytesMb(file.size)} MB).`,
      };
    }
  }

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { ok: false, error: "Storage not configured." };

  let categoryFolderId: string;
  try {
    const { folderItemId } = await ensureCaseCategoryFolder(
      caseRow.sharepoint_folder_id,
      templateDoc.group.name,
    );
    categoryFolderId = folderItemId;
  } catch (err) {
    console.error("[resolvePortalUploadContext] folder ensure failed:", err);
    return {
      ok: false,
      error: "We couldn't reach storage. Please try again in a minute.",
    };
  }

  return {
    ok: true,
    ctx: {
      caseRow,
      templateDoc: { document_label: templateDoc.document_label },
      categoryName: templateDoc.group.name,
      categoryFolderId,
      driveId,
    },
  };
}

/**
 * uploadFileAsClient — fresh upload from the client portal. v1, new
 * file_group_key (DB default). Used for first uploads on a slot AND for
 * sibling files when expected_quantity > 1 (Inc 4 UI calls this
 * directly for siblings).
 */
export async function uploadFileAsClient(
  token: string,
  documentCode: string,
  formData: FormData,
): Promise<UploadAsClientResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid link" };
  if (!documentCode || documentCode.length > 50) {
    return { error: "Invalid document code" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }

  const caseRow = await loadCaseByPortalToken(token);
  if (!caseRow) {
    return {
      error:
        "This upload link is no longer active. Please contact our office for a new link.",
    };
  }

  const supabase = adminClient();
  const ctxRes = await resolvePortalUploadContext(
    supabase,
    caseRow,
    documentCode,
    file,
  );
  if (!ctxRes.ok) return { error: ctxRes.error };
  const { ctx } = ctxRes;

  const uploadName = composePortalFileName(documentCode, file.name, 1);
  const buffer = new Uint8Array(await file.arrayBuffer());

  let uploadResponse;
  try {
    uploadResponse = await graphUploadFile(
      ctx.driveId,
      ctx.categoryFolderId,
      uploadName,
      buffer,
      file.type,
    );
  } catch (err) {
    console.error("[uploadFileAsClient] OneDrive upload failed:", err);
    return {
      error:
        "We couldn't upload your file. Try a different file or contact our office.",
    };
  }

  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: ctx.caseRow.id,
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
      // file_group_key omitted; DB default fills.
      uploaded_by_staff: null,
      uploaded_by_client: true,
    })
    .select("id")
    .single();
  if (insertErr || !newDoc) {
    return {
      error: `Could not record upload: ${insertErr?.message ?? "unknown"}`,
    };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "document_received",
      event_data: {
        document_code: documentCode,
        document_id: newDoc.id,
        version_number: 1,
        file_name: uploadName,
        source: "client_portal",
      },
      description: `Client uploaded ${ctx.templateDoc.document_label} (v1)`,
      visible_to_client: true,
      created_by: null,
    });

  revalidatePath(`/dashboard/cases/${ctx.caseRow.id}`);
  revalidatePath(`/upload/${token}`);
  return { ok: true, documentId: newDoc.id };
}

/**
 * reuploadFileAsClient — replaces a rejected file from the client
 * portal. Same invariants as the staff reuploadFile: rejected -> super-
 * seded BEFORE the new INSERT, captured atomically via UPDATE...RETURNING.
 *
 * The token validation ALSO scopes the file_group_key to this portal's
 * case: we look up the live row's case_id and reject if it doesn't
 * match the case the token resolves to. Without this guard, a forged
 * file_group_key on this portal could reach files outside the case.
 */
export async function reuploadFileAsClient(
  token: string,
  fileGroupKey: string,
  formData: FormData,
): Promise<UploadAsClientResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid link" };
  if (!TOKEN_RE.test(fileGroupKey)) return { error: "Invalid file group" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: `File exceeds the 4MB limit (${formatBytesMb(file.size)} MB).`,
    };
  }

  const caseRow = await loadCaseByPortalToken(token);
  if (!caseRow) {
    return {
      error:
        "This upload link is no longer active. Please contact our office for a new link.",
    };
  }

  const supabase = adminClient();

  // 1. Probe the group. Also enforce case scoping.
  const { data: live } = await supabase
    .schema("files")
    .from("documents")
    .select("id, case_id, client_id, document_code, version_number, status")
    .eq("file_group_key", fileGroupKey)
    .neq("status", "superseded")
    .is("deleted_at", null)
    .maybeSingle();
  if (!live) return { error: "File not found" };
  if (live.case_id !== caseRow.id) return { error: "File not found" };
  if (!live.document_code) {
    return { error: "Cannot re-upload an additional document via this action." };
  }
  if (live.status !== "rejected") {
    return {
      error: "Only rejected files can be re-uploaded. Refresh and try again.",
    };
  }

  const ctxRes = await resolvePortalUploadContext(
    supabase,
    caseRow,
    live.document_code,
    file,
  );
  if (!ctxRes.ok) return { error: ctxRes.error };
  const { ctx } = ctxRes;

  const nextVersion = live.version_number + 1;
  const uploadName = composePortalFileName(
    live.document_code,
    file.name,
    nextVersion,
  );
  const buffer = new Uint8Array(await file.arrayBuffer());

  // 2. Graph upload first (no DB damage if it fails).
  let uploadResponse;
  try {
    uploadResponse = await graphUploadFile(
      ctx.driveId,
      ctx.categoryFolderId,
      uploadName,
      buffer,
      file.type,
    );
  } catch (err) {
    console.error("[reuploadFileAsClient] OneDrive upload failed:", err);
    return {
      error:
        "We couldn't upload your file. Try a different file or contact our office.",
    };
  }

  // 3. UPDATE rejected -> superseded with double precondition.
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
    console.error("[reuploadFileAsClient] supersede update failed:", updErr);
    return {
      error:
        "We saved your file but couldn't update the prior version. Please contact our office.",
    };
  }
  if (!superseded) {
    return {
      error:
        "Another action changed this file. Refresh the page and try again.",
    };
  }

  // 4. INSERT v(N+1).
  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: ctx.caseRow.id,
      client_id: ctx.caseRow.client_id,
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
      uploaded_by_staff: null,
      uploaded_by_client: true,
    })
    .select("id")
    .single();

  if (insertErr || !newDoc) {
    return {
      error: `Could not record upload: ${insertErr?.message ?? "unknown"}`,
    };
  }

  // 5. Audit.
  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "document_received",
      event_data: {
        document_code: live.document_code,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
        source: "client_portal",
        supersedes_document_id: superseded.id,
      },
      description: `Client re-uploaded ${ctx.templateDoc.document_label} (v${nextVersion})`,
      visible_to_client: true,
      created_by: null,
    });

  // 6. Best-effort move of the superseded item into the group's
  //    "99 Rejected/" subfolder. Same shape as the staff path;
  //    enqueue + try inline; failures get retried by the daily
  //    drive-moves cron. Parent is the category folder (e.g.
  //    "01 Identity") so rejected files stay co-located with their
  //    active siblings.
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

  revalidatePath(`/dashboard/cases/${ctx.caseRow.id}`);
  revalidatePath(`/upload/${token}`);
  return { ok: true, documentId: newDoc.id };
}

/**
 * uploadAsClient — backward-compatible wrapper. Dispatches to
 * uploadFileAsClient (fresh slot) or reuploadFileAsClient (rejected
 * slot). Refuses replacement when the slot has a non-rejected live row.
 * Inc 4's UI will call uploadFileAsClient / reuploadFileAsClient
 * directly and this wrapper will be retired.
 */
export async function uploadAsClient(
  token: string,
  documentCode: string,
  formData: FormData,
): Promise<UploadAsClientResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid link" };
  if (!documentCode || documentCode.length > 50) {
    return { error: "Invalid document code" };
  }

  const caseRow = await loadCaseByPortalToken(token);
  if (!caseRow) {
    return {
      error:
        "This upload link is no longer active. Please contact our office for a new link.",
    };
  }

  const supabase = adminClient();

  // Same predicate as uniq_document_live_per_group: not superseded AND
  // not soft-deleted.
  const { data: live } = await supabase
    .schema("files")
    .from("documents")
    .select("file_group_key, status")
    .eq("case_id", caseRow.id)
    .eq("document_code", documentCode)
    .neq("status", "superseded")
    .is("deleted_at", null)
    .maybeSingle();

  if (!live) {
    return uploadFileAsClient(token, documentCode, formData);
  }
  if (live.status === "rejected") {
    return reuploadFileAsClient(token, live.file_group_key, formData);
  }
  return {
    error:
      "We've already received a file for this requirement. Wait for staff to review it.",
  };
}

// ============================================================================
// FLOW-3d: portal-side upload against an ad-hoc additional-document row.
// Identifies the target by case_required_documents.id (no document_code).
// Mirrors uploadAsClient minus the template lookup.
// ============================================================================

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function uploadAsClientAdditional(
  token: string,
  requiredDocumentId: string,
  formData: FormData,
): Promise<UploadAsClientResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid link" };
  if (!UUID_RE.test(requiredDocumentId)) {
    return { error: "Invalid document id" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided" };
  if (file.size === 0) return { error: "File is empty" };
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

  const caseRow = await loadCaseByPortalToken(token);
  if (!caseRow) {
    return {
      error:
        "This upload link is no longer active. Please contact our office for a new link.",
    };
  }
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "We couldn't store your file right now. Please contact our office.",
    };
  }

  const supabase = adminClient();

  // Confirm the required-doc row is ad-hoc + belongs to this case.
  const { data: reqDoc } = await supabase
    .schema("crm")
    .from("case_required_documents")
    .select("id, case_id, custom_label, requested_at_event_id")
    .eq("id", requiredDocumentId)
    .maybeSingle();
  if (!reqDoc || reqDoc.case_id !== caseRow.id) {
    return { error: "Document not found on this case." };
  }
  if (!reqDoc.requested_at_event_id) {
    return {
      error: "This isn't an additional-documents request.",
    };
  }
  const displayName = reqDoc.custom_label ?? "Additional document";

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "Upload destination unavailable." };

  // Sanitize filename + upload to case root folder (no category subfolder
  // since ad-hoc docs don't carry a template group).
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const uploadName = `additional_${requiredDocumentId.slice(0, 8)}_${safe}`;

  let uploadResponse: { id: string; name: string; webUrl: string; size: number };
  try {
    uploadResponse = await graphUploadFile(
      driveId,
      caseRow.sharepoint_folder_id,
      uploadName,
      file,
      file.type,
    );
  } catch {
    return {
      error:
        "We couldn't upload your file. Try a different file or contact our office.",
    };
  }

  // Supersede prior versions for this required-doc row.
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
      case_id: caseRow.id,
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
      uploaded_by_staff: null,
      uploaded_by_client: true,
    })
    .select("id")
    .single();
  if (insertErr || !newDoc) {
    return {
      error: `Could not record upload: ${insertErr?.message ?? "unknown"}`,
    };
  }

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseRow.id,
      event_type: "document_received",
      event_data: {
        required_document_id: requiredDocumentId,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
        source: "client_portal",
      },
      description: `Client uploaded additional document: ${displayName} (v${nextVersion})`,
      visible_to_client: true,
      created_by: null,
    });

  revalidatePath(`/dashboard/cases/${caseRow.id}`);
  revalidatePath(`/upload/${token}`);
  return { ok: true, documentId: newDoc.id };
}
