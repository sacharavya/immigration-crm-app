"use server";

import { randomBytes } from "node:crypto";

import { adminClient } from "@/lib/supabase/admin";
import { fileTypeFromBuffer } from "file-type";
import { z } from "zod";

import { syncAppointmentCreate } from "@/lib/appointments/sync";
import {
  sendAppointmentConfirmation,
  sendInternalNotification,
  sendPaymentPending,
  sendPaymentStaffNotification,
} from "@/lib/email/appointments";
import { maybeSendConsultationAgreement } from "@/lib/consultation/send";
import { ensureConsultationPaymentsFolder } from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { getPublicTenantId } from "@/lib/tenant/context";

import type { BookingResult } from "./_components/types";
import {
  consultationIntakeScalars,
  consultationIntakeJsonb,
} from "@/lib/clients/consultation-intake";

// Service-role client. The booking page is anonymous, so every query goes
// through service-role (matching the upload portal pattern). No user
// session exists to drive RLS.

const bookSchema = z.object({
  appointment_type_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\d\s()+\-./]+$/, "Invalid phone number format"),
  reason: z.string().min(1).max(2000),
  location_type: z.enum(["online", "onsite"]),
  consent: z.literal(true),
  client_timezone: z.string().max(100).optional(),
  // Onsite paid bookings may pay cash at the office: skips the e-transfer
  // flow entirely and confirms immediately.
  pay_in_office: z.boolean().optional().default(false),
  // Core intake (address is required; the rest help staff prepare).
  address: z.string().min(1).max(300),
  city: z.string().max(120).optional().default(""),
  province: z.string().max(120).optional().default(""),
  postal_code: z.string().max(20).optional().default(""),
  date_of_birth: z.string().optional().default(""),
  marital_status: z.string().max(20).optional().default(""),
  highest_education: z.string().max(200).optional().default(""),
  language_test: z.string().max(60).optional().default(""),
  language_score: z.string().max(120).optional().default(""),
  occupation: z.string().max(200).optional().default(""),
});


function splitName(full: string): { given: string; family: string | null } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { given: parts[0], family: null };
  return {
    given: parts[0],
    family: parts.slice(1).join(" "),
  };
}

export async function bookAppointment(
  payload: unknown,
): Promise<BookingResult> {
  const parsed = bookSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  // Which firm is being booked. Public pages carry no session, so the firm
  // comes from the request host. Every query below is service-role and so
  // bypasses RLS — this id is the only thing scoping them.
  const tenantId = await getPublicTenantId();
  if (!tenantId) return { ok: false, error: "booking_disabled" };

  const supabase = adminClient();

  // 1. Feature flag check.
  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select(
      "public_booking_enabled, timezone, office_address, minimum_lead_time_hours, maximum_horizon_days",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!settings?.public_booking_enabled) {
    return { ok: false, error: "booking_disabled" };
  }

  // 2. Load the type, verify it's public + active.
  const { data: type } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, duration_minutes, default_location_type, is_public, active, requires_case, fee_cad",
    )
    .eq("tenant_id", tenantId)
    .eq("id", data.appointment_type_id)
    .eq("is_public", true)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!type) {
    return { ok: false, error: "invalid_type" };
  }
  // APPT-7 belt-and-suspenders: the DB constraint (20260531000002) now
  // prevents the combination, but if older data still has it, refuse to
  // create an appointment that we couldn't satisfy without a case link.
  if (type.requires_case) {
    return { ok: false, error: "invalid_type" };
  }

  // APPT-8: paid-flow detection. The fee is snapshotted on the appointment
  // so a later price-change on the type doesn't retroactively re-bill the
  // client. Status, sync, and confirmation email all branch on this.
  const feeRaw = type.fee_cad === null ? null : Number(type.fee_cad);
  const isPaid = feeRaw !== null && feeRaw > 0;
  // Pay in Office: onsite paid bookings may pay cash at the office. The fee
  // stays snapshotted so staff collect it in person; the booking confirms
  // immediately. Online paid bookings keep the mandatory e-transfer flow.
  const payInOffice =
    isPaid && data.pay_in_office && data.location_type === "onsite";
  const initialStatus: "confirmed" | "pending_payment" =
    isPaid && !payInOffice ? "pending_payment" : "confirmed";
  const feeAtBooking = isPaid ? feeRaw : null;

  // 3. Compute ends_at from type duration.
  const startsAt = new Date(data.starts_at);
  const endsAt = new Date(
    startsAt.getTime() + type.duration_minutes * 60 * 1000,
  );

  // 4. Time-window validation.
  const now = new Date();
  const earliestBookable = new Date(
    now.getTime() + settings.minimum_lead_time_hours * 60 * 60 * 1000,
  );
  const latestBookable = new Date(
    now.getTime() + settings.maximum_horizon_days * 86400 * 1000,
  );
  if (startsAt < earliestBookable) return { ok: false, error: "too_soon" };
  if (startsAt > latestBookable) return { ok: false, error: "too_far" };

  // 5. Slot is free? (RPC enforces the global-mode no-overlap rule.)
  const { data: slotFree } = await supabase
    .schema("crm")
    .rpc("appointment_slot_is_free", {
      p_tenant: tenantId,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
    });
  if (slotFree !== true) return { ok: false, error: "slot_taken" };

  // 6. Per-email rate limit (3 attempts in the last hour).
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("snapshot_client_email", emailLower)
    .gte("created_at", oneHourAgo);
  if ((recentCount ?? 0) >= 3) return { ok: false, error: "rate_limited" };

  // 7. One active future appointment per email.
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, starts_at")
    .eq("tenant_id", tenantId)
    .eq("snapshot_client_email", emailLower)
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "existing_appointment",
      existing_date: existing.starts_at,
    };
  }

  // 8. Find-or-create the client (email match, lowercase normalised).
  const { data: existingClient } = await supabase
    .schema("crm")
    .from("clients")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("email", emailLower)
    .is("deleted_at", null)
    .maybeSingle();

  let clientId: string;
  if (existingClient) {
    clientId = existingClient.id;
    // Fill in the fresh details they just provided. Merge the intake JSONB so
    // a re-booking updates language test / education / occupation without
    // clobbering other background_responses keys.
    const { data: cur } = await supabase
      .schema("crm")
      .from("clients")
      .select("background_responses")
      .eq("id", clientId)
      .maybeSingle();
    await supabase
      .schema("crm")
      .from("clients")
      .update({
        ...consultationIntakeScalars(data),
        background_responses: {
          ...((cur?.background_responses as Record<string, unknown>) ?? {}),
          ...consultationIntakeJsonb(data),
        },
      })
      .eq("id", clientId);
  } else {
    // crm.generate_client_number() returns the next "BB-C-YYYY-NNNN" string.
    const { data: nextNumber, error: numErr } = await supabase
      .schema("crm")
      .rpc("generate_client_number", { p_tenant: tenantId });
    if (numErr || !nextNumber) {
      return { ok: false, error: "client_creation_failed" };
    }
    const { given, family } = splitName(data.name);
    const { data: newClient, error: clientErr } = await supabase
      .schema("crm")
      .from("clients")
      .insert({
        tenant_id: tenantId,
        client_number: nextNumber,
        legal_name_full: data.name.trim(),
        given_names: given,
        family_name: family,
        email: emailLower,
        phone_primary: data.phone,
        status: "lead",
        source: "public_booking",
        ...consultationIntakeScalars(data),
        background_responses: consultationIntakeJsonb(data),
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return { ok: false, error: "client_creation_failed" };
    }
    clientId = newClient.id;
  }

  // 9. Resolve location fields.
  const locationType = data.location_type;
  const onsiteAddress =
    locationType === "onsite" ? settings.office_address : null;
  // No settings.default_online_link in v1; staff fills the Teams link
  // manually until teams_auto_create flips on. APPT-5 may auto-include
  // a generic instructions block.
  const onlineLink: string | null = null;

  // 10. Management token + expiry (24h after the appointment ends).
  const managementToken = randomBytes(32).toString("hex");
  const managementTokenExpiresAt = new Date(
    endsAt.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // 11. Insert the appointment. APPT-8: paid types land in pending_payment;
  // free types land in confirmed as before. graph_sync_status stays null
  // for paid types until staff accepts — no point creating a calendar
  // event or Teams meeting for a booking that might get rejected.
  const { data: appt, error: apptErr } = await supabase
    .schema("crm")
    .from("appointments")
    .insert({
      tenant_id: tenantId,
      appointment_type_id: type.id,
      client_id: clientId,
      case_id: null,
      snapshot_client_name: data.name.trim(),
      snapshot_client_email: emailLower,
      snapshot_client_phone: data.phone,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone: data.client_timezone || settings.timezone,
      location_type: locationType,
      online_link: onlineLink,
      onsite_address: onsiteAddress,
      assigned_staff_id: null,
      reason: data.reason,
      staff_notes: null,
      status: initialStatus,
      fee_cad_at_booking: feeAtBooking,
      pay_in_office: payInOffice,
      booking_source: "public_portal",
      management_token: managementToken,
      management_token_expires_at: managementTokenExpiresAt,
      graph_sync_status: initialStatus === "pending_payment" ? null : "pending",
    })
    .select("id")
    .single();
  if (apptErr || !appt) {
    return { ok: false, error: "booking_failed" };
  }

  // 12. Side effects: only ONLINE paid bookings wait for the e-transfer.
  // Free and pay-in-office bookings confirm immediately.
  if (initialStatus === "pending_payment") {
    // APPT-8: paid flow. The "Action needed" email gives the prospect a
    // management URL backup if they close the tab — they finish the
    // upload from there. No calendar event, no Teams, no confirmation.
    await sendPaymentPending(supabase, appt.id);
  } else {
    // Free flow (unchanged from APPT-5/7): Graph sync + confirmation +
    // internal notification.
    await syncAppointmentCreate(supabase, appt.id);
    const confRes = await sendAppointmentConfirmation(supabase, appt.id);
    if (confRes.ok) {
      await supabase
        .schema("crm")
        .from("appointments")
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq("id", appt.id);
    }
    await sendInternalNotification(supabase, appt.id);
  }

  // Email a consultation-agreement sign-link if the type requires it and the
  // client is a first-time (non-retained) client. Best-effort. The returned URL
  // lets the confirmation prompt the client to sign inline too (email = fallback).
  const consultationSignUrl = await maybeSendConsultationAgreement(
    supabase,
    appt.id,
  );

  return {
    ok: true,
    appointment_id: appt.id,
    management_token: managementToken,
    starts_at: startsAt.toISOString(),
    location_type: locationType,
    onsite_address: onsiteAddress,
    online_link: onlineLink,
    duration_minutes: type.duration_minutes,
    type_name: type.name,
    payment_required: initialStatus === "pending_payment",
    fee_cad: feeAtBooking,
    appointment_short_id: appt.id.slice(0, 8),
    consultation_sign_url: consultationSignUrl,
  };
}

// ---------------------------------------------------------------------------
// APPT-8: uploadPaymentProof — public action invoked from the booking
// confirmation page AND the management page. Validates the token, ensures
// the appointment is in pending_payment, uploads the file to OneDrive
// (Consultation Payments/{year}/), creates a files.documents row, flips
// status to awaiting_review, and notifies staff. CRM is the source of truth:
// a Graph upload failure leaves the appointment unchanged.
// ---------------------------------------------------------------------------

const TOKEN_RE = /^[0-9a-f]{64}$/i;
const ALLOWED_PROOF_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/heic",
  "application/pdf",
]);
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

export type UploadProofResult =
  | { ok: true; status: "confirmed" }
  | { ok: false; error: string };

export async function uploadPaymentProof(
  formData: FormData,
): Promise<UploadProofResult> {
  const token = String(formData.get("token") ?? "");
  if (!TOKEN_RE.test(token)) return { ok: false, error: "invalid_token" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "no_file" };
  if (!ALLOWED_PROOF_MIME.has(file.type)) {
    return { ok: false, error: "unsupported_file_type" };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { ok: false, error: "file_too_large" };
  }

  const supabase = adminClient();

  const { data: appt } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, tenant_id, client_id, status, starts_at, snapshot_client_name, fee_cad_at_booking")
    .eq("management_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!appt) return { ok: false, error: "invalid_token" };
  if (appt.status !== "pending_payment") {
    return { ok: false, error: "not_pending_payment" };
  }
  if (!appt.client_id) {
    return { ok: false, error: "missing_client" };
  }

  // Upload to OneDrive under Consultation Payments/{year}/. Year is taken
  // from the appointment's scheduled date so screenshots are filed in the
  // year of the meeting (rather than the year of the upload), which keeps
  // bookings near year boundaries together.
  const year = new Date(appt.starts_at)
    .toLocaleDateString("en-CA", { timeZone: "America/Toronto" })
    .slice(0, 4);
  const ext = mimeToExtension(file.type);
  const safeName = `${appt.id.slice(0, 8)}_${slugifyName(appt.snapshot_client_name)}_${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte verification — the browser-reported MIME type is
  // trivially spoofed. Check actual file content before uploading.
  const detected = await fileTypeFromBuffer(buffer);
  if (detected && !ALLOWED_PROOF_MIME.has(detected.mime)) {
    return { ok: false, error: "unsupported_file_type" };
  }
  // PDFs sometimes lack a detectable magic byte via file-type (rare
  // but possible for linearized PDFs). If file.type says PDF and
  // detection returns undefined, accept it — the MIME allowlist
  // already passed above.

  let driveItem: { id: string; webUrl: string; driveId: string };
  try {
    // The firm comes from the appointment the token resolved, never from the
    // request host: a client paying a consultation fee has no session and
    // may well be on a host that names no firm. This was the one public call
    // that threw once a second firm existed.
    const folder = await ensureConsultationPaymentsFolder(
      appt.tenant_id,
      year,
    );
    const uploaded = await uploadFile(
      folder.driveId,
      folder.folderItemId,
      safeName,
      buffer,
      file.type,
    );
    driveItem = {
      id: uploaded.id,
      webUrl: uploaded.webUrl,
      driveId: folder.driveId,
    };
  } catch (err) {
    console.error("[book.uploadPaymentProof] OneDrive upload failed:", err);
    return { ok: false, error: "upload_failed" };
  }

  // Insert the files.documents row. `category` is a free string column,
  // so a stable "Consultation Payment Proof" value lets the existing
  // payments page filter without any new ref tables.
  const { data: docRow, error: docErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      client_id: appt.client_id,
      file_name: safeName,
      display_name: `Payment proof — ${appt.snapshot_client_name}`,
      mime_type: file.type,
      sharepoint_drive_id: driveItem.driveId,
      sharepoint_item_id: driveItem.id,
      sharepoint_web_url: driveItem.webUrl,
      category: "Consultation Payment Proof",
      uploaded_by_client: true,
      file_size_bytes: file.size,
    })
    .select("id")
    .single();
  if (docErr || !docRow) {
    console.error(
      "[book.uploadPaymentProof] documents insert failed:",
      docErr,
    );
    return { ok: false, error: "doc_insert_failed" };
  }

  // Atomic guard: only confirm if the row is still in pending_payment. If a
  // concurrent upload already claimed it, this UPDATE matches zero rows and
  // we return an error - prevents the TOCTOU race where two simultaneous
  // uploads both succeed. The staff review step is REMOVED: a proof upload
  // confirms the booking immediately; staff see the proof on the appointment
  // and can cancel if something is wrong.
  const { data: flipped, error: updErr } = await supabase
    .schema("crm")
    .from("appointments")
    .update({
      payment_screenshot_id: docRow.id,
      payment_uploaded_at: new Date().toISOString(),
      status: "confirmed",
      graph_sync_status: "pending",
    })
    .eq("id", appt.id)
    .eq("status", "pending_payment")
    .select("id")
    .maybeSingle();
  if (updErr) {
    console.error(
      "[book.uploadPaymentProof] appointment status flip failed:",
      updErr,
    );
    return { ok: false, error: "update_failed" };
  }
  if (!flipped) {
    // Another concurrent upload already claimed this appointment.
    return { ok: false, error: "not_pending_payment" };
  }

  // The review step used to create the crm.payments money record on accept;
  // with auto-confirm that responsibility moves here so the ledger stays
  // complete. Nature starts pending_decision (deposit vs consultation fee is
  // decided later on the Payments page).
  const fee = Number(appt.fee_cad_at_booking ?? 0);
  if (fee > 0 && appt.client_id) {
    const { data: payment } = await supabase
      .schema("crm")
      .from("payments")
      .insert({
        client_id: appt.client_id,
        case_id: null,
        amount_cad: fee,
        method: "e_transfer",
        received_date: new Date().toISOString().slice(0, 10),
        reference: `appt:${appt.id.slice(0, 8)}`,
        notes: `Consultation payment for appointment ${appt.id.slice(0, 8)}`,
        proof_document_id: docRow.id,
        consultation_payment_nature: "pending_decision",
        recorded_by: null,
        is_refund: false,
      })
      .select("id")
      .single();
    if (payment) {
      await supabase
        .schema("crm")
        .from("appointments")
        .update({ linked_payment_id: payment.id })
        .eq("id", appt.id);
    }
  }

  // Confirmed now: calendar sync + confirmation email fire immediately.
  await syncAppointmentCreate(supabase, appt.id);
  const confRes = await sendAppointmentConfirmation(supabase, appt.id);
  if (confRes.ok) {
    await supabase
      .schema("crm")
      .from("appointments")
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq("id", appt.id);
  }
  // FYI to staff that a proof arrived (no action required anymore).
  await sendPaymentStaffNotification(supabase, appt.id);

  return { ok: true, status: "confirmed" };
}

function mimeToExtension(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/heic") return ".heic";
  if (mime === "application/pdf") return ".pdf";
  return "";
}

function slugifyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40)
    .toLowerCase();
}

