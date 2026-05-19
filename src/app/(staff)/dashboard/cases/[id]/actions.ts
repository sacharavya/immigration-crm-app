"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { tryAutoAdvanceFromRetainerPending } from "@/lib/cases/auto-advance";
import { sendEmail } from "@/lib/email/client";
import { logEmail } from "@/lib/email/log";
import { shouldRateLimit } from "@/lib/email/rate-limit";
import { clientUploadInviteEmail } from "@/lib/email/templates/client-upload-invite";
import { getBaseUrl } from "@/lib/email/url";
import { graphFetch } from "@/lib/graph/client";
import { ensureCasePaymentsFolder } from "@/lib/graph/folders";
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
    uploaded = await uploadFile(
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

  const { data: doc } = await supabase
    .schema("files")
    .from("documents")
    .select(
      "id, case_id, document_code, status, display_name, version_number",
    )
    .eq("id", parsed.data.documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc) return { error: "Document not found" };
  if (!doc.case_id) {
    return { error: "Document is not attached to a case." };
  }
  if (doc.status === "superseded") {
    return {
      error:
        "This version was replaced by a newer upload. Review the latest one instead.",
    };
  }

  const reviewedAt = new Date().toISOString();
  if (parsed.data.decision === "accept") {
    const { error } = await supabase
      .schema("files")
      .from("documents")
      .update({
        status: "accepted",
        reviewed_by: me.id,
        reviewed_at: reviewedAt,
        rejection_reason: null,
      })
      .eq("id", doc.id);
    if (error) return { error: error.message };

    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: doc.case_id,
        event_type: "document_accepted",
        event_data: {
          document_code: doc.document_code,
          document_id: doc.id,
          version_number: doc.version_number,
        },
        description: `Accepted: ${doc.display_name} (v${doc.version_number})`,
        created_by: me.id,
      });
  } else {
    const { error } = await supabase
      .schema("files")
      .from("documents")
      .update({
        status: "rejected",
        reviewed_by: me.id,
        reviewed_at: reviewedAt,
        rejection_reason: parsed.data.reason,
      })
      .eq("id", doc.id);
    if (error) return { error: error.message };

    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: doc.case_id,
        event_type: "document_rejected",
        event_data: {
          document_code: doc.document_code,
          document_id: doc.id,
          version_number: doc.version_number,
          reason: parsed.data.reason,
        },
        description: `Rejected: ${doc.display_name} (v${doc.version_number}) — ${parsed.data.reason}`,
        created_by: me.id,
      });
  }

  revalidatePath(`/dashboard/cases/${doc.case_id}`);
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
]);

export type RecordCaseEventInput = z.infer<typeof recordCaseEventSchema>;
export type RecordCaseEventResult =
  | { ok: true; event_id: string }
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
  }

  revalidatePath(`/dashboard/cases/${caseId}`);
  return { ok: true, event_id: inserted.id };
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
