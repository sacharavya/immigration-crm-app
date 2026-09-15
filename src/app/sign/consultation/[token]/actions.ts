"use server";

import { headers } from "next/headers";

import {
  loadConsultationAgreementData,
  renderConsultationAgreementPdf,
} from "@/lib/consultation/agreement";
import { sendEmail } from "@/lib/email/client";
import { consultationAgreementSignedEmail } from "@/lib/email/templates/consultation-agreement-signed";
import { ensureConsultationAgreementsFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { adminClient } from "@/lib/supabase/admin";

const TOKEN_RE = /^[0-9a-f]{64}$/i;
const SIG_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

export async function submitConsultationSignature(input: {
  token: string;
  signatureDataUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!TOKEN_RE.test(input.token)) return { ok: false, error: "invalid_token" };
  if (
    !SIG_RE.test(input.signatureDataUrl) ||
    input.signatureDataUrl.length > 2_000_000
  ) {
    return { ok: false, error: "invalid_signature" };
  }

  const supabase = adminClient();
  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      "id, tenant_id, client_id, snapshot_client_name, snapshot_client_email, starts_at, consultation_agreement_signed_at, consultation_agreement_token_expires_at",
    )
    .eq("consultation_agreement_token", input.token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { ok: false, error: "invalid_token" };
  if (appt.consultation_agreement_signed_at) return { ok: true }; // idempotent
  if (
    appt.consultation_agreement_token_expires_at &&
    new Date(appt.consultation_agreement_token_expires_at) < new Date()
  ) {
    return { ok: false, error: "expired" };
  }

  const now = new Date();
  const data = await loadConsultationAgreementData(appt.id, now);

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent")?.slice(0, 1000) ?? null;

  // Archive the signed PDF. Failure must not lose the signature.
  let docId: string | null = null;
  let pdf: Buffer | null = null;
  try {
    pdf = await renderConsultationAgreementPdf({
      ...data,
      client_signature_image_url: input.signatureDataUrl,
    });
    const year = new Date(appt.starts_at)
      .toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
      .slice(0, 4);
    const safeName = `${appt.id.slice(0, 8)}_consultation-agreement.pdf`;
    const folder = await ensureConsultationAgreementsFolder(appt.tenant_id, year);
    const uploaded = await uploadFile(
      folder.driveId,
      folder.folderItemId,
      safeName,
      pdf,
      "application/pdf",
    );
    const { data: docRow } = await supabase
      .schema("files")
      .from("documents")
      .insert({
        client_id: appt.client_id,
        file_name: safeName,
        display_name: `Initial Consultation Agreement — ${appt.snapshot_client_name}`,
        mime_type: "application/pdf",
        sharepoint_drive_id: folder.driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        category: "Initial Consultation Agreement",
        uploaded_by_client: true,
        file_size_bytes: pdf.length,
      })
      .select("id")
      .single();
    docId = docRow?.id ?? null;
  } catch (err) {
    console.error("[submitConsultationSignature] archive failed:", err);
  }

  // Frozen terms snapshot — signatures stay in the PDF, not the DB.
  const {
    rcic_signature_image_url: _r,
    client_signature_image_url: _c,
    signed_date: _s,
    ...terms
  } = data;
  void _r;
  void _c;
  void _s;

  const { error } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      consultation_agreement_signed_at: now.toISOString(),
      consultation_agreement_ip: ip,
      consultation_agreement_user_agent: ua,
      consultation_agreement_terms: terms,
      consultation_agreement_document_id: docId,
    })
    .eq("id", appt.id);
  if (error) return { ok: false, error: "update_failed" };

  // Email the signed copy (best-effort).
  if (pdf) {
    try {
      const em = consultationAgreementSignedEmail({
        clientName: appt.snapshot_client_name,
      });
      await sendEmail({
        to: appt.snapshot_client_email,
        subject: em.subject,
        html: em.html,
        text: em.text,
        attachments: [
          { filename: "consultation-agreement.pdf", content: pdf },
        ],
      });
    } catch (err) {
      console.error("[submitConsultationSignature] signed email failed:", err);
    }
  }

  return { ok: true };
}
