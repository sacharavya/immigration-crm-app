"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { ensureCaseRetainerFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

// Server actions for the case detail Retainer tab. All gated by
// manage_retainers (or void_retainers for voidRetainer). Audit triggers
// fire on every UPDATE/INSERT here automatically.

type RetainerUpdate =
  Database["crm"]["Tables"]["retainer_agreements"]["Update"];

const TOKEN_TTL_DAYS = 7;
const FEE_TOLERANCE_CENTS = 0.011; // 1¢ + epsilon

async function gate() {
  const me = await getStaff();
  if (!me) return { ok: false as const, error: "Not authenticated" };
  if (!staffCan(me, "manage_retainers")) {
    return {
      ok: false as const,
      error: "You don't have permission to manage retainers.",
    };
  }
  return { ok: true as const, me };
}

function rev(caseId: string) {
  revalidatePath(`/dashboard/cases/${caseId}`);
}

async function loadRetainerWithCase(retainerId: string) {
  const supabase = await createClient();
  const { data: retainer } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("*")
    .eq("id", retainerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!retainer) return null;
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      "id, quoted_fee_cad, retainer_minimum_cad, service_type_id, assigned_rcic, sharepoint_folder_id",
    )
    .eq("id", retainer.case_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return null;
  return { retainer, caseRow };
}

// ---------------------------------------------------------------------------
// updateRetainerDetails — fee breakdown + service description
// ---------------------------------------------------------------------------

const detailsSchema = z.object({
  retainerId: z.string().uuid(),
  service_description: z.string().trim().min(1).max(200),
  government_fee_cad: z.coerce.number().min(0),
  first_installment_cad: z.coerce.number().positive(),
  second_installment_cad: z.coerce.number().positive(),
  hst_cad: z.coerce.number().min(0),
  withdrawal_refund_floor_cad: z.coerce.number().min(0),
});

export async function updateRetainerDetails(
  input: z.input<typeof detailsSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await loadRetainerWithCase(parsed.data.retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "signed" || ctx.retainer.status === "uploaded") {
    return { error: "Cannot edit a signed retainer. Void it and start over." };
  }

  // Installments must reconstitute the case's quoted fee. The retainer
  // snapshot fields (quoted_fee_cad_at_signing) are set at send time,
  // so pre-send we validate against the live cases.quoted_fee_cad.
  const quoted = Number(ctx.caseRow.quoted_fee_cad);
  const sum = parsed.data.first_installment_cad + parsed.data.second_installment_cad;
  if (Math.abs(sum - quoted) > FEE_TOLERANCE_CENTS) {
    return {
      error: `First + Second installments must equal the case's quoted fee (${quoted} CAD). Currently: ${sum} CAD.`,
    };
  }

  const supabase = await createClient();
  const updates: RetainerUpdate = {
    service_description: parsed.data.service_description,
    government_fee_cad: parsed.data.government_fee_cad,
    first_installment_cad: parsed.data.first_installment_cad,
    second_installment_cad: parsed.data.second_installment_cad,
    hst_cad: parsed.data.hst_cad,
    withdrawal_refund_floor_cad: parsed.data.withdrawal_refund_floor_cad,
    quoted_fee_cad_at_signing: quoted,
  };
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update(updates)
    .eq("id", parsed.data.retainerId);
  if (error) return { error: error.message };

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// setRetainerRcic — explicitly assign which RCIC counter-signs this
// retainer. The case's `assigned_rcic` may be a non-RCIC staff member
// (e.g. an admin running the case); the retainer's `rcic_id` is the
// authoritative party for the agreement document.
// ---------------------------------------------------------------------------

const setRcicSchema = z.object({
  retainerId: z.string().uuid(),
  rcicStaffId: z.string().uuid(),
});

export async function setRetainerRcic(
  input: z.input<typeof setRcicSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = setRcicSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await loadRetainerWithCase(parsed.data.retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "signed" || ctx.retainer.status === "uploaded") {
    return {
      error: "Cannot change the RCIC on a completed retainer. Void it first.",
    };
  }

  const supabase = await createClient();
  const { data: staffRow } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, is_rcic, is_active")
    .eq("id", parsed.data.rcicStaffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!staffRow) return { error: "Staff member not found" };
  if (!staffRow.is_active) return { error: "Staff member is not active" };
  if (!staffRow.is_rcic) {
    return {
      error:
        "That staff member isn't flagged as an RCIC. Update their record first.",
    };
  }

  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({ rcic_id: parsed.data.rcicStaffId })
    .eq("id", parsed.data.retainerId);
  if (error) return { error: error.message };

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// prepareRetainerForSending — pre-flight check, no mutation
// ---------------------------------------------------------------------------

export async function prepareRetainerForSending(
  retainerId: string,
): Promise<
  | { ok: true }
  | {
      error: string;
      code?: "rcic_signature_missing" | "rcic_not_assigned";
    }
> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };

  // RCIC resolution mirrors loadRetainerData: explicit retainer.rcic_id
  // wins; otherwise fall back to assigned_rcic if that staff is_rcic;
  // otherwise the firm's only RCIC if there's exactly one. Any other
  // shape blocks sending.
  const supabase = await createClient();
  let rcicStaffId: string | null = ctx.retainer.rcic_id ?? null;
  if (!rcicStaffId) {
    const { data: assigned } = await supabase
      .schema("crm")
      .from("staff")
      .select("id, is_rcic")
      .eq("id", ctx.caseRow.assigned_rcic)
      .is("deleted_at", null)
      .maybeSingle();
    if (assigned?.is_rcic) {
      rcicStaffId = assigned.id;
    } else {
      const { data: rcicList } = await supabase
        .schema("crm")
        .from("staff")
        .select("id")
        .eq("is_rcic", true)
        .eq("is_active", true)
        .is("deleted_at", null)
        .limit(2);
      if (rcicList && rcicList.length === 1) {
        rcicStaffId = rcicList[0].id;
      }
    }
  }

  if (!rcicStaffId) {
    return {
      error:
        "Pick the RCIC who will counter-sign before sending. Use the RCIC selector in this tab.",
      code: "rcic_not_assigned",
    };
  }

  const { data: rcic } = await supabase
    .schema("crm")
    .from("staff")
    .select("signature_image_url, is_rcic, rcic_membership_number")
    .eq("id", rcicStaffId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!rcic || !rcic.is_rcic) {
    return {
      error:
        "The selected staff member isn't flagged as an RCIC. Update their record or pick a different one.",
      code: "rcic_not_assigned",
    };
  }
  if (!rcic.signature_image_url) {
    return {
      error:
        "The selected RCIC must set up their signature before sending. Settings → My signature.",
      code: "rcic_signature_missing",
    };
  }

  // Service description + fee breakdown are auto-derived from the case
  // (quoted_fee_cad, retainer_minimum_cad, service_types.name) at send
  // time — no inline form, no "details incomplete" gate. The send
  // action snapshots the derived values onto the retainer row.

  return { ok: true };
}

// ---------------------------------------------------------------------------
// sendRetainerForSignature
// ---------------------------------------------------------------------------

const sendSchema = z.object({
  retainerId: z.string().uuid(),
  recipient_email: z.string().email("Invalid email"),
  send_email: z.boolean().default(true),
});

export async function sendRetainerForSignature(
  input: z.input<typeof sendSchema>,
): Promise<{ ok: true; signing_path: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const pre = await prepareRetainerForSending(parsed.data.retainerId);
  if ("error" in pre) return { error: pre.error };

  const ctx = await loadRetainerWithCase(parsed.data.retainerId);
  if (!ctx) return { error: "Retainer not found" };

  const token = randomUUID();
  const expires = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Snapshot derived fee/service values from the case onto the retainer
  // row so the agreement renders consistently from this point forward
  // even if the case fee changes later. Fields explicitly set on the
  // retainer (very rare path, only via direct SQL) are preserved.
  const supabase = await createClient();
  const { data: serviceType } = await supabase
    .schema("ref")
    .from("service_types")
    .select("name")
    .eq("id", ctx.caseRow.service_type_id)
    .maybeSingle();

  const quoted = Number(ctx.caseRow.quoted_fee_cad);
  const caseRetainerMin =
    ctx.caseRow.retainer_minimum_cad !== null
      ? Number(ctx.caseRow.retainer_minimum_cad)
      : null;
  const firstInst =
    ctx.retainer.first_installment_cad ??
    caseRetainerMin ??
    Math.round(quoted * 0.5 * 100) / 100;
  const secondInst =
    ctx.retainer.second_installment_cad ??
    Math.max(0, Math.round((quoted - Number(firstInst)) * 100) / 100);
  const hst =
    ctx.retainer.hst_cad ?? Math.round(quoted * 0.13 * 100) / 100;
  const withdrawalFloor =
    ctx.retainer.withdrawal_refund_floor_cad ?? Number(firstInst);

  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "pending_signature",
      method: "online_signature",
      signing_token: token,
      token_expires_at: expires,
      sent_to_email: parsed.data.recipient_email,
      sent_at: new Date().toISOString(),
      // Snapshot
      quoted_fee_cad_at_signing: quoted,
      service_description:
        ctx.retainer.service_description ?? serviceType?.name ?? null,
      first_installment_cad: Number(firstInst),
      second_installment_cad: Number(secondInst),
      hst_cad: Number(hst),
      withdrawal_refund_floor_cad: Number(withdrawalFloor),
      government_fee_cad: ctx.retainer.government_fee_cad ?? 0,
    })
    .eq("id", parsed.data.retainerId);
  if (error) return { error: error.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "retainer_sent",
      description: `Retainer sent to ${parsed.data.recipient_email}`,
      event_data: {
        recipient_email: parsed.data.recipient_email,
        token_expires_at: expires,
        send_email: parsed.data.send_email,
      },
      created_by: g.me.id,
    });

  // Email firing is RET-6's job; for now we just persist sent_at.
  // The signing link is returned so staff can copy/paste in chat or
  // manually email it until Resend wiring lands.

  rev(ctx.caseRow.id);
  return { ok: true, signing_path: `/sign/retainer/${token}` };
}

// ---------------------------------------------------------------------------
// resendRetainerEmail
// ---------------------------------------------------------------------------

export async function resendRetainerEmail(
  retainerId: string,
): Promise<{ ok: true; signing_path: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status !== "pending_signature") {
    return { error: "Only retainers awaiting signature can be resent." };
  }
  if (!ctx.retainer.signing_token) {
    return { error: "No signing token on file. Send for signature first." };
  }

  const expires = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      resent_count: (ctx.retainer.resent_count ?? 0) + 1,
      last_resent_at: new Date().toISOString(),
      token_expires_at: expires,
    })
    .eq("id", retainerId);
  if (error) return { error: error.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "retainer_resent",
      description: `Retainer resent (token reset, expires ${expires.slice(0, 10)})`,
      event_data: {
        token_expires_at: expires,
        resent_count: (ctx.retainer.resent_count ?? 0) + 1,
      },
      created_by: g.me.id,
    });

  rev(ctx.caseRow.id);
  return { ok: true, signing_path: `/sign/retainer/${ctx.retainer.signing_token}` };
}

// ---------------------------------------------------------------------------
// cancelSigning
// ---------------------------------------------------------------------------

export async function cancelSigning(
  retainerId: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status !== "pending_signature") {
    return { error: "Can only cancel a retainer that's awaiting signature." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "draft",
      signing_token: null,
      token_expires_at: null,
      sent_to_email: null,
      sent_at: null,
    })
    .eq("id", retainerId);
  if (error) return { error: error.message };

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// getSigningLink — returns existing valid token, otherwise generates a new
// one and flips status to pending_signature.
// ---------------------------------------------------------------------------

export async function getSigningLink(
  retainerId: string,
): Promise<{ ok: true; signing_path: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const pre = await prepareRetainerForSending(retainerId);
  if ("error" in pre) return { error: pre.error };

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "signed" || ctx.retainer.status === "uploaded") {
    return { error: "This retainer is already complete." };
  }
  if (ctx.retainer.status === "void") {
    return { error: "This retainer is void. Start a new one." };
  }

  const now = Date.now();
  const tokenIsValid =
    ctx.retainer.signing_token &&
    ctx.retainer.token_expires_at &&
    new Date(ctx.retainer.token_expires_at).getTime() > now;

  if (tokenIsValid && ctx.retainer.signing_token) {
    return {
      ok: true,
      signing_path: `/sign/retainer/${ctx.retainer.signing_token}`,
    };
  }

  // Existing token is expired / missing. Mint a fresh one and flip
  // status to pending_signature. We don't update sent_to_email/sent_at
  // here — those track the explicit "Send" action.
  const token = randomUUID();
  const expires = new Date(
    now + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "pending_signature",
      method: "online_signature",
      signing_token: token,
      token_expires_at: expires,
    })
    .eq("id", retainerId);
  if (error) return { error: error.message };

  rev(ctx.caseRow.id);
  return { ok: true, signing_path: `/sign/retainer/${token}` };
}

// ---------------------------------------------------------------------------
// voidRetainer
// ---------------------------------------------------------------------------

const voidSchema = z.object({
  retainerId: z.string().uuid(),
  reason: z.string().trim().min(1, "Reason is required").max(500),
});

export async function voidRetainer(
  input: z.input<typeof voidSchema>,
): Promise<{ ok: true } | { error: string }> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "void_retainers")) {
    return { error: "You don't have permission to void retainers." };
  }

  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await loadRetainerWithCase(parsed.data.retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "void") {
    return { error: "Already void." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "void",
      void_reason: parsed.data.reason,
      voided_at: new Date().toISOString(),
      voided_by: me.id,
      signing_token: null,
      token_expires_at: null,
    })
    .eq("id", parsed.data.retainerId);
  if (error) return { error: error.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "retainer_voided",
      description: `Retainer voided: ${parsed.data.reason}`,
      event_data: { reason: parsed.data.reason },
      created_by: me.id,
    });

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// startNewRetainer — creates a fresh draft for a case whose previous
// retainer is void. The void row stays for audit; the new row becomes
// the "active" retainer (UNIQUE on case_id requires the void row to be
// soft-deleted or for the schema to allow multiple).
//
// The schema declares case_id UNIQUE on retainer_agreements, so before
// inserting the new row we must soft-delete the void one. Audit log
// captures both events.
// ---------------------------------------------------------------------------

export async function startNewRetainer(
  caseId: string,
): Promise<{ ok: true; retainerId: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, status")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing && existing.status !== "void") {
    return {
      error:
        "A non-void retainer already exists. Void it first before starting a new one.",
    };
  }

  if (existing) {
    // Soft-delete the void row to free the UNIQUE constraint on case_id.
    const { error: delErr } = await supabase
      .schema("crm")
      .from("retainer_agreements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (delErr) return { error: delErr.message };
  }

  const { data, error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .insert({
      case_id: caseId,
      status: "draft",
      created_by: g.me.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Insert failed" };

  rev(caseId);
  return { ok: true, retainerId: data.id };
}

// ---------------------------------------------------------------------------
// applyClientSignatureImage — staff-side equivalent of the public
// signing page's "Upload signature image" tab. Takes a client-signature
// image (drawn elsewhere, photo'd, or scanned), overlays it onto the
// system-generated agreement, generates the final PDF, and uploads it
// to OneDrive. Useful when the client signed on paper or sent the
// signature image via another channel — the agreement still becomes
// the system's canonical record (status='signed', not 'uploaded').
// ---------------------------------------------------------------------------

const SIG_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
]);
const SIG_MAX_BYTES = 2 * 1024 * 1024;

export async function applyClientSignatureImage(
  retainerId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  if (!z.string().uuid().safeParse(retainerId).success) {
    return { error: "Invalid retainer id" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > SIG_MAX_BYTES) {
    return { error: "Signature image must be under 2 MB." };
  }
  if (!SIG_MIME.has(file.type)) {
    return { error: `Unsupported file type: ${file.type}` };
  }

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "signed" || ctx.retainer.status === "uploaded") {
    return { error: "This retainer is already complete." };
  }

  // Pre-flight: details + RCIC signature must be in place; otherwise
  // the resulting PDF would either fail to render or contain blanks
  // where the fee table belongs.
  const pre = await prepareRetainerForSending(retainerId);
  if ("error" in pre) return { error: pre.error };

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  const supabase = await createClient();
  const { error: signErr } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "signed",
      method: "signature_image_overlay",
      signed_at: new Date().toISOString(),
      signed_by_staff_id: ctx.caseRow.assigned_rcic,
      client_signature_image_url: dataUrl,
    })
    .eq("id", retainerId);
  if (signErr) return { error: signErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "retainer_signed",
      description: "Client signature image applied by staff",
      event_data: {
        method: "signature_image_overlay",
        applied_by_staff_id: g.me.id,
      },
      created_by: g.me.id,
    });

  // Generate the final PDF + upload to OneDrive. Best-effort — if
  // Chromium hiccups, the signature event is still on the row and the
  // staff member can retry from the View signed PDF link.
  try {
    if (!ctx.caseRow.sharepoint_folder_id) {
      console.warn(
        `[applyClientSignatureImage] retainer ${retainerId} signed but case folder not provisioned`,
      );
    } else {
      const { renderRetainerPdf } = await import("@/lib/pdf/render-retainer");
      const pdf = await renderRetainerPdf(retainerId);
      const today = new Date().toISOString().slice(0, 10);
      const fileName = `Retainer_Signed_${today}.pdf`;
      const folder = await ensureCaseRetainerFolder(
        ctx.caseRow.sharepoint_folder_id,
      );
      const uploaded = await uploadFile(
        folder.driveId,
        folder.folderItemId,
        fileName,
        pdf,
        "application/pdf",
      );
      const { data: doc } = await supabase
        .schema("files")
        .from("documents")
        .insert({
          case_id: ctx.caseRow.id,
          category: "retainer",
          document_code: "SIGNED_RETAINER",
          display_name: "Signed Retainer Agreement",
          file_name: fileName,
          file_size_bytes: pdf.byteLength,
          mime_type: "application/pdf",
          sharepoint_drive_id: folder.driveId,
          sharepoint_item_id: uploaded.id,
          sharepoint_web_url: uploaded.webUrl,
          status: "accepted",
          uploaded_by_staff: g.me.id,
        })
        .select("id")
        .single();
      if (doc) {
        await supabase
          .schema("crm")
          .from("retainer_agreements")
          .update({ final_document_id: doc.id })
          .eq("id", retainerId);
      }
    }
  } catch (err) {
    console.error(
      `[applyClientSignatureImage] PDF/upload failed for ${retainerId}:`,
      err,
    );
    // Signature event already committed above; staff can retry the PDF
    // generation from the Retainer tab's View signed PDF link.
  }

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// uploadSignedRetainer
// ---------------------------------------------------------------------------

const ALLOWED_SCAN_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
]);
const SCAN_MAX_BYTES = 10 * 1024 * 1024;

export async function uploadSignedRetainer(
  retainerId: string,
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  if (!z.string().uuid().safeParse(retainerId).success) {
    return { error: "Invalid retainer id" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > SCAN_MAX_BYTES) {
    return { error: "File must be under 10 MB." };
  }
  if (!ALLOWED_SCAN_MIME.has(file.type)) {
    return { error: `Unsupported file type: ${file.type}` };
  }

  const ctx = await loadRetainerWithCase(retainerId);
  if (!ctx) return { error: "Retainer not found" };
  if (ctx.retainer.status === "signed" || ctx.retainer.status === "uploaded") {
    return { error: "This retainer is already complete." };
  }
  if (!ctx.caseRow.sharepoint_folder_id) {
    return {
      error:
        "OneDrive folder not provisioned for this case yet. Use the OneDrive card to retry folder creation, then upload again.",
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  let driveId: string;
  let folderItemId: string;
  try {
    const folder = await ensureCaseRetainerFolder(
      ctx.caseRow.sharepoint_folder_id,
    );
    driveId = folder.driveId;
    folderItemId = folder.folderItemId;
  } catch (err) {
    return {
      error: `Could not access OneDrive folder: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const safeName = file.name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim() || `signed-retainer-${Date.now()}`;

  let uploaded;
  try {
    uploaded = await uploadFile(
      driveId,
      folderItemId,
      safeName,
      buffer,
      file.type,
    );
  } catch (err) {
    return {
      error: `OneDrive upload failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const supabase = await createClient();
  const { data: doc, error: docErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: ctx.caseRow.id,
      category: "retainer",
      document_code: "SIGNED_RETAINER",
      display_name: "Signed Retainer Agreement",
      file_name: safeName,
      file_size_bytes: file.size,
      mime_type: file.type,
      sharepoint_drive_id: driveId,
      sharepoint_item_id: uploaded.id,
      sharepoint_web_url: uploaded.webUrl,
      status: "accepted",
      uploaded_by_staff: g.me.id,
    })
    .select("id")
    .single();
  if (docErr || !doc) {
    return {
      error: `Could not record document: ${docErr?.message ?? "unknown"}`,
    };
  }

  const { error: updErr } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "uploaded",
      method: "scanned_upload",
      signed_at: new Date().toISOString(),
      signed_by_staff_id: ctx.caseRow.assigned_rcic,
      final_document_id: doc.id,
    })
    .eq("id", retainerId);
  if (updErr) return { error: updErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "retainer_uploaded",
      description: `Signed retainer uploaded: ${safeName}`,
      event_data: {
        document_id: doc.id,
        sharepoint_web_url: uploaded.webUrl,
      },
      created_by: g.me.id,
    });

  rev(ctx.caseRow.id);
  return { ok: true };
}
