"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { graphFetch } from "@/lib/graph/client";
import { uploadFile } from "@/lib/graph/uploads";
import type { Database } from "@/lib/supabase/types";
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

// Statuses where the portal stays active. Once the case moves past
// documentation_review (submitted_to_ircc, biometrics, decision, closed)
// the token lookup just stops succeeding.
const ACTIVE_STATUSES = [
  "retainer_pending",
  "documentation_in_progress",
  "documentation_review",
] as const;

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type ClientPortalCase = {
  id: string;
  case_number: string;
  client_id: string;
  service_template_id: string;
  sharepoint_folder_id: string | null;
  status: string;
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
  if (!ACTIVE_STATUSES.includes(data.status as (typeof ACTIVE_STATUSES)[number])) {
    return null;
  }
  return data;
}

export type UploadAsClientResult =
  | { ok: true; documentId: string }
  | { error: string };

export async function uploadAsClient(
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
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "Documents folder is still being created — please try again in a few seconds.",
    };
  }

  const supabase = adminClient();

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
    return { error: "That document isn't part of your case checklist." };
  }
  if (!templateDoc.group) {
    return {
      error: "Document group missing. Please contact our office.",
    };
  }

  // Per-template MIME allow-list (falls back to global default).
  const allowed = templateDoc.allowed_file_types?.length
    ? new Set(templateDoc.allowed_file_types)
    : ALLOWED_MIME_TYPES_SET;
  if (!allowed.has(file.type)) {
    const human = templateDoc.allowed_file_types?.length
      ? templateDoc.allowed_file_types.join(", ")
      : ALLOWED_EXTENSIONS_HUMAN;
    return {
      error: `File type ${file.type || "unknown"} is not allowed. Use ${human}.`,
    };
  }
  if (templateDoc.max_file_size_mb !== null) {
    const cap = Math.min(templateDoc.max_file_size_mb, 4) * 1024 * 1024;
    if (file.size > cap) {
      return {
        error: `File exceeds the ${Math.min(templateDoc.max_file_size_mb, 4)}MB limit (${formatBytesMb(file.size)} MB).`,
      };
    }
  }

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "Storage not configured." };

  // Find the category subfolder under the case folder. Created at case
  // setup; the client upload doesn't create folders, just locates the
  // matching one by group name.
  let categoryFolderId: string;
  try {
    const children = await graphFetch<{
      value: Array<{ id: string; name: string; folder?: object }>;
    }>(
      `/drives/${driveId}/items/${caseRow.sharepoint_folder_id}/children?$select=id,name,folder`,
    );
    const match = children.value.find(
      (c) => c.folder && c.name === templateDoc.group?.name,
    );
    if (!match) {
      return {
        error:
          "Storage folder isn't ready yet. Please contact our office.",
      };
    }
    categoryFolderId = match.id;
  } catch (err) {
    console.error("[uploadAsClient] folder lookup failed:", err);
    return {
      error: "We couldn't reach storage. Please try again in a minute.",
    };
  }

  // Versioning: mark prior non-superseded uploads on this slot as
  // superseded; the new upload becomes the latest version.
  const { data: existing } = await supabase
    .schema("files")
    .from("documents")
    .select("id, version_number, status")
    .eq("case_id", caseRow.id)
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

  // Filename: prefix with the document code so the OneDrive listing is
  // self-describing even if the client's filename is generic.
  const safeBase =
    file.name.replace(/[\\/:*?"<>|]/g, "_").trim() ||
    `${documentCode}-v${nextVersion}`;
  const uploadName = `${documentCode}__v${nextVersion}__${safeBase}`;

  const buffer = new Uint8Array(await file.arrayBuffer());
  let uploadResponse;
  try {
    uploadResponse = await uploadFile(
      driveId,
      categoryFolderId,
      uploadName,
      buffer,
      file.type,
    );
  } catch (err) {
    console.error("[uploadAsClient] OneDrive upload failed:", err);
    return {
      error:
        "We couldn't upload your file. Try a different file or contact our office.",
    };
  }

  const { data: newDoc, error: insertErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseRow.id,
      client_id: caseRow.client_id,
      document_code: documentCode,
      display_name: templateDoc.document_label,
      category: templateDoc.group.name,
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
        document_code: documentCode,
        document_id: newDoc.id,
        version_number: nextVersion,
        file_name: uploadName,
        source: "client_portal",
      },
      description: `Client uploaded ${templateDoc.document_label} (v${nextVersion})`,
      visible_to_client: true,
      created_by: null,
    });

  // Revalidate both surfaces — the staff case page so the new upload
  // appears in awaiting-review state, and the client portal itself so
  // the row immediately reflects the new status.
  revalidatePath(`/dashboard/cases/${caseRow.id}`);
  revalidatePath(`/upload/${token}`);
  return { ok: true, documentId: newDoc.id };
}
