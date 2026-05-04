"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { ensureCaseRetainerFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import {
  renderRetainerPdf,
  RetainerRenderError,
} from "@/lib/pdf/render-retainer";
import type { Database } from "@/lib/supabase/types";

// Public server actions for the /sign/retainer/[token] page. No auth.
// Token validation gates every write. Service-role client bypasses RLS
// since the request comes from an unauthenticated browser.
//
// Single-use enforcement: after a successful submit the retainer's
// status flips to 'signed' (or 'uploaded'), which the token validator
// rejects on subsequent attempts. The signing_token itself is preserved
// so the confirmation page's download route can re-validate the token
// against the now-signed retainer.

const TOKEN_RE = /^[0-9a-f-]{36}$/i;
const SIGNATURE_DATA_URL_RE = /^data:image\/(png|jpeg|jpg|heic);base64,/i;
const ACCEPTED_SIGNATURE_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
]);
const ACCEPTED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

type SubmitResult =
  | { ok: true; download_path: string | null }
  | { error: string };

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

async function captureRequestMetadata() {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const rawIp = xff?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  // Postgres INET rejects malformed values. Only persist what looks
  // plausibly like an IP — anything else falls through to null.
  const ip = isPlausibleIp(rawIp) ? rawIp : null;
  const ua = h.get("user-agent")?.slice(0, 1000) ?? null;
  return { ip, ua };
}

function isPlausibleIp(s: string): boolean {
  if (!s) return false;
  // IPv4 dot-quad, or IPv6 with at least one colon. Postgres parses both.
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(s) || /^[0-9a-f:]+$/i.test(s);
}

async function loadRetainerByToken(token: string) {
  if (!TOKEN_RE.test(token)) return null;
  const supabase = adminClient();
  const { data } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select(
      "id, case_id, status, signing_token, token_expires_at, deleted_at",
    )
    .eq("signing_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  if (data.status !== "pending_signature") return null;
  if (
    data.token_expires_at &&
    new Date(data.token_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  return data;
}

async function loadCaseFolderId(caseId: string): Promise<string | null> {
  const supabase = adminClient();
  const { data } = await supabase
    .schema("crm")
    .from("cases")
    .select("sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.sharepoint_folder_id ?? null;
}

// ---------------------------------------------------------------------------
// submitOnlineSignature — signature pad capture
// ---------------------------------------------------------------------------

const onlineSchema = z.object({
  token: z.string().regex(TOKEN_RE, "Invalid token"),
  signatureDataUrl: z
    .string()
    .regex(SIGNATURE_DATA_URL_RE, "Signature must be a PNG/JPEG/HEIC data URL"),
});

export async function submitOnlineSignature(
  input: z.input<typeof onlineSchema>,
): Promise<SubmitResult> {
  const parsed = onlineSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const retainer = await loadRetainerByToken(parsed.data.token);
  if (!retainer) {
    return { error: "This signing link is invalid or has expired." };
  }

  const match = parsed.data.signatureDataUrl.match(
    /^data:(image\/[a-z]+);base64,(.*)$/i,
  );
  if (!match) return { error: "Could not parse signature image" };
  const mimeType = match[1].toLowerCase();
  if (!ACCEPTED_SIGNATURE_MIME.has(mimeType)) {
    return { error: `Unsupported signature image type: ${mimeType}` };
  }
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > SIGNATURE_MAX_BYTES) {
    return { error: "Signature image must be under 2 MB" };
  }

  return finishOnlineSignature(retainer, parsed.data.signatureDataUrl, "online_signature");
}

// ---------------------------------------------------------------------------
// submitImageSignature — uploaded signature image
// ---------------------------------------------------------------------------

export async function submitImageSignature(
  token: string,
  formData: FormData,
): Promise<SubmitResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid token" };

  const retainer = await loadRetainerByToken(token);
  if (!retainer) {
    return { error: "This signing link is invalid or has expired." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > SIGNATURE_MAX_BYTES) {
    return { error: "Signature image must be under 2 MB" };
  }
  if (!ACCEPTED_SIGNATURE_MIME.has(file.type)) {
    return { error: `Unsupported file type: ${file.type}` };
  }

  // Convert to data URL for storage (matches submitOnlineSignature). The
  // RetainerDocument <img> renders directly from the data URL during
  // PDF generation — no auth-bound OneDrive URL to resolve.
  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  return finishOnlineSignature(retainer, dataUrl, "signature_image_overlay");
}

// Shared finalisation for the two signature flows: persist signature,
// generate the final PDF, upload to OneDrive, link the document. PDF
// failure does not roll back the signature — the row is still marked
// signed and staff can retry PDF generation from the Retainer tab.
async function finishOnlineSignature(
  retainer: NonNullable<Awaited<ReturnType<typeof loadRetainerByToken>>>,
  signatureDataUrl: string,
  method: "online_signature" | "signature_image_overlay",
): Promise<SubmitResult> {
  const meta = await captureRequestMetadata();
  const supabase = adminClient();

  // Step 1: commit the signature event. This is the durable record;
  // PDF generation can be retried from the staff side.
  const { error: signErr } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "signed",
      method,
      signed_at: new Date().toISOString(),
      signed_ip_address: meta.ip,
      signed_user_agent: meta.ua,
      client_signature_image_url: signatureDataUrl,
    })
    .eq("id", retainer.id);
  if (signErr) {
    return { error: signErr.message };
  }

  // Insert the signing event ahead of the PDF gen so even a Chromium
  // failure leaves the audit trail intact.
  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: retainer.case_id,
      event_type: "retainer_signed",
      description:
        method === "online_signature"
          ? "Retainer signed online by client"
          : "Retainer signed by uploaded image overlay",
      event_data: {
        method,
        ip: meta.ip,
        user_agent: meta.ua,
      },
    });

  // Step 2: generate the final PDF and upload it to OneDrive. Best
  // effort — failures don't roll back the signature event.
  let downloadPath: string | null = null;
  try {
    const folderId = await loadCaseFolderId(retainer.case_id);
    if (!folderId) {
      console.warn(
        `[signing] retainer ${retainer.id} signed but case folder not provisioned; PDF skipped`,
      );
    } else {
      const pdf = await renderRetainerPdf(retainer.id);
      const today = new Date().toISOString().slice(0, 10);
      const fileName = `Retainer_Signed_${today}.pdf`;
      const folder = await ensureCaseRetainerFolder(folderId);
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
          case_id: retainer.case_id,
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
          uploaded_by_client: true,
        })
        .select("id")
        .single();

      if (doc) {
        await supabase
          .schema("crm")
          .from("retainer_agreements")
          .update({ final_document_id: doc.id })
          .eq("id", retainer.id);
        // Use a token-scoped public download path so the client gets
        // their copy without needing OneDrive auth.
        downloadPath = `/sign/retainer/${retainer.signing_token}/download`;
      }
    }
  } catch (err) {
    if (err instanceof RetainerRenderError) {
      console.error(
        `[signing] PDF generation failed for retainer ${retainer.id}:`,
        err.code,
        err.message,
      );
    } else {
      console.error(
        `[signing] PDF/upload failed for retainer ${retainer.id}:`,
        err,
      );
    }
    // downloadPath stays null — the confirmation page will surface a
    // soft "we'll email you a copy" note instead of a download button.
  }

  revalidatePath(`/dashboard/cases/${retainer.case_id}`);
  return { ok: true, download_path: downloadPath };
}

// ---------------------------------------------------------------------------
// submitScannedDocument — full document upload (paper / external e-sign)
// ---------------------------------------------------------------------------

export async function submitScannedDocument(
  token: string,
  formData: FormData,
): Promise<SubmitResult> {
  if (!TOKEN_RE.test(token)) return { error: "Invalid token" };

  const retainer = await loadRetainerByToken(token);
  if (!retainer) {
    return { error: "This signing link is invalid or has expired." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file attached" };
  if (file.size === 0) return { error: "File is empty" };
  if (file.size > DOCUMENT_MAX_BYTES) {
    return { error: "File must be under 10 MB" };
  }
  if (!ACCEPTED_DOCUMENT_MIME.has(file.type)) {
    return { error: `Unsupported file type: ${file.type}` };
  }

  const folderId = await loadCaseFolderId(retainer.case_id);
  if (!folderId) {
    return {
      error:
        "We couldn't store your document right now. Please contact your immigration consultant.",
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const safeName =
    file.name.replace(/[\\/:*?"<>|]/g, "_").trim() ||
    `signed-retainer-${Date.now()}`;

  let uploaded;
  try {
    const folder = await ensureCaseRetainerFolder(folderId);
    uploaded = await uploadFile(
      folder.driveId,
      folder.folderItemId,
      safeName,
      buffer,
      file.type,
    );

    const supabase = adminClient();
    const { data: doc, error: docErr } = await supabase
      .schema("files")
      .from("documents")
      .insert({
        case_id: retainer.case_id,
        category: "retainer",
        document_code: "SIGNED_RETAINER",
        display_name: "Signed Retainer Agreement (scan)",
        file_name: safeName,
        file_size_bytes: file.size,
        mime_type: file.type,
        sharepoint_drive_id: folder.driveId,
        sharepoint_item_id: uploaded.id,
        sharepoint_web_url: uploaded.webUrl,
        status: "accepted",
        uploaded_by_client: true,
      })
      .select("id")
      .single();
    if (docErr || !doc) {
      return { error: docErr?.message ?? "Could not record document." };
    }

    const meta = await captureRequestMetadata();
    const { error: updErr } = await supabase
      .schema("crm")
      .from("retainer_agreements")
      .update({
        status: "uploaded",
        method: "scanned_upload",
        signed_at: new Date().toISOString(),
        signed_ip_address: meta.ip,
        signed_user_agent: meta.ua,
        final_document_id: doc.id,
      })
      .eq("id", retainer.id);
    if (updErr) return { error: updErr.message };

    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: retainer.case_id,
        event_type: "retainer_uploaded",
        description: "Signed retainer uploaded by client",
        event_data: {
          method: "scanned_upload",
          ip: meta.ip,
          user_agent: meta.ua,
          file_name: safeName,
          sharepoint_web_url: uploaded.webUrl,
        },
      });
  } catch (err) {
    console.error("[signing] scanned upload failed:", err);
    return {
      error:
        "We couldn't upload your document. Please try again, or email us directly.",
    };
  }

  revalidatePath(`/dashboard/cases/${retainer.case_id}`);
  // Scanned uploads don't get a public download — the file lives in
  // the firm's OneDrive. Confirmation page surfaces a "we received it"
  // message without a download link.
  return { ok: true, download_path: null };
}
