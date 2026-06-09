"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { ensureCasePaymentsFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import type { Database } from "@/lib/supabase/types";

// Public client-side payment proof upload. Token-gated; mirrors the
// shape of src/app/upload/[token]/actions.ts but writes a crm.payments
// row instead of a files.documents checklist entry. The same case
// client_portal_token controls both surfaces.

const TOKEN_RE = /^[0-9a-f-]{36}$/i;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
  "image/webp",
]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB; same cap as staff attachPaymentProof.

// Statuses where the pay portal stays active. Once the case is closed
// or in a settled phase, the link goes dead — this matches the doc-
// upload portal's pre-submission gating semantics.
const ACTIVE_STATUSES = [
  "retainer_pending",
  "documentation_in_progress",
  "documentation_review",
  "submitted_to_ircc",
  "passport_requested",
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

export type PayPortalCase = {
  id: string;
  case_number: string;
  client_id: string;
  status: string;
  quoted_fee_cad: number;
  already_paid_cad: number;
  amount_due_cad: number;
  sharepoint_folder_id: string | null;
  client_name: string;
};

export async function loadCaseByPayToken(
  token: string,
): Promise<PayPortalCase | null> {
  if (!TOKEN_RE.test(token)) return null;
  const sb = adminClient();
  const { data: caseRow } = await sb
    .schema("crm")
    .from("cases")
    .select(
      "id, case_number, client_id, status, quoted_fee_cad, sharepoint_folder_id, client:clients(legal_name_full, given_names, preferred_name)",
    )
    .eq("client_portal_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return null;
  if (
    !ACTIVE_STATUSES.includes(
      caseRow.status as (typeof ACTIVE_STATUSES)[number],
    )
  ) {
    return null;
  }

  const { data: priorPayments } = await sb
    .schema("crm")
    .from("payments")
    .select("amount_cad")
    .eq("case_id", caseRow.id)
    .is("deleted_at", null);
  const alreadyPaid = (priorPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_cad),
    0,
  );
  const quoted = Number(caseRow.quoted_fee_cad);
  const amountDue = Math.max(0, quoted - alreadyPaid);

  const clientName =
    caseRow.client?.preferred_name?.trim() ||
    caseRow.client?.given_names?.trim() ||
    caseRow.client?.legal_name_full ||
    "there";

  return {
    id: caseRow.id,
    case_number: caseRow.case_number,
    client_id: caseRow.client_id,
    status: caseRow.status,
    quoted_fee_cad: quoted,
    already_paid_cad: alreadyPaid,
    amount_due_cad: amountDue,
    sharepoint_folder_id: caseRow.sharepoint_folder_id,
    client_name: clientName,
  };
}

export type SubmitProofResult =
  | { ok: true; paymentId: string; documentId: string }
  | { error: string };

// Public action: client submits payment proof via the portal. Creates
// the payment row + uploads the file into the case's "00 Payments"
// folder + links the document.
//
// Method is fixed to "e_transfer" because the email instructions
// only describe that path. If staff want to support card/cheque in
// future they should add a method picker here.
export async function submitCasePaymentProof(
  token: string,
  formData: FormData,
): Promise<SubmitProofResult> {
  const caseRow = await loadCaseByPayToken(token);
  if (!caseRow) {
    return { error: "This payment link isn't active." };
  }
  if (caseRow.amount_due_cad <= 0) {
    return { error: "This case is already paid in full." };
  }
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "We're still setting up your file. Please contact our office before uploading.",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Proof must be under 10 MB." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      error: `File type ${file.type || "unknown"} is not allowed. Use PDF, PNG, JPG, HEIC, or WebP.`,
    };
  }
  const amountRaw = formData.get("amount_cad");
  const amount =
    typeof amountRaw === "string" ? Number.parseFloat(amountRaw) : NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid payment amount." };
  }
  if (amount > caseRow.amount_due_cad + 0.01) {
    return {
      error: `Amount exceeds the outstanding balance ($${caseRow.amount_due_cad.toFixed(2)}). Edit and resend.`,
    };
  }

  const sb = adminClient();
  const buffer = new Uint8Array(await file.arrayBuffer());
  const today = new Date().toISOString().slice(0, 10);
  const safeBase =
    file.name.replace(/[\\/:*?"<>|]/g, "_").trim() ||
    `payment-${caseRow.case_number}`;
  const fileName = `${today}_${safeBase}`;

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

    const { data: doc, error: docErr } = await sb
      .schema("files")
      .from("documents")
      .insert({
        case_id: caseRow.id,
        client_id: caseRow.client_id,
        category: "payment_proof",
        document_code: "PAYMENT_PROOF",
        display_name: `Client-uploaded payment proof — ${today} ($${amount.toFixed(2)})`,
        file_name: fileName,
        file_size_bytes: file.size,
        mime_type: file.type,
        sharepoint_drive_id: folder.driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        status: "accepted",
        // No uploaded_by_staff — this is a portal upload.
        uploaded_by_client: true,
      })
      .select("id")
      .single();
    if (docErr || !doc) {
      return { error: docErr?.message ?? "Could not record proof document." };
    }

    const { data: payment, error: payErr } = await sb
      .schema("crm")
      .from("payments")
      .insert({
        case_id: caseRow.id,
        client_id: caseRow.client_id,
        amount_cad: amount,
        method: "e_transfer",
        reference: caseRow.case_number,
        received_date: today,
        notes: "Client-uploaded via /pay portal.",
        is_refund: false,
        recorded_by: null,
        proof_document_id: doc.id,
        client_uploaded_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (payErr || !payment) {
      return { error: payErr?.message ?? "Could not record payment." };
    }

    // Surface in the case timeline so staff sees the upload land in
    // real time. created_by stays NULL (portal upload, not a staff
    // actor) — the DB trigger captures the row mutation regardless.
    await sb
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: caseRow.id,
        event_type: "fee_collected",
        event_data: {
          amount_cad: amount,
          method: "e_transfer",
          payment_id: payment.id,
          source: "client_via_portal",
        },
        description: `Client uploaded payment proof: $${amount.toFixed(2)}.`,
        visible_to_client: false,
        created_by: null,
      });

    revalidatePath(`/dashboard/cases/${caseRow.id}`);
    return { ok: true, paymentId: payment.id, documentId: doc.id };
  } catch (err) {
    console.error("[submitCasePaymentProof] upload failed:", err);
    return {
      error:
        "We couldn't upload your proof. Try a different file or contact our office.",
    };
  }
}
