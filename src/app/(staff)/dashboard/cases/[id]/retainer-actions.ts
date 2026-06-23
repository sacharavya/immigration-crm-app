"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { sendEmail } from "@/lib/email/client";
import { logEmail } from "@/lib/email/log";
import { shouldRateLimit } from "@/lib/email/rate-limit";
import { retainerInviteEmail } from "@/lib/email/templates/retainer-invite";
import { getBaseUrl } from "@/lib/email/url";
import {
  createCaseFolderStructure,
  ensureCaseRetainerFolder,
} from "@/lib/graph/folders";
import { uploadFile } from "@/lib/graph/uploads";
import { renderRetainerPdf } from "@/lib/pdf/render-retainer";
import { resolveServiceLabel } from "@/lib/retainer/service-label";
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
      "id, case_number, status, client_id, quoted_fee_cad, retainer_minimum_cad, government_fee_cad, service_type_id, assigned_rcic, sharepoint_folder_id",
    )
    .eq("id", retainer.case_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return null;
  return { retainer, caseRow };
}

async function loadClient(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, legal_name_full, given_names, preferred_name, email")
    .eq("id", clientId)
    .maybeSingle();
  return data;
}

// Reads the full client + RCIC rows used at send/sign time to populate
// the *_at_signing snapshot columns. Centralising the projection keeps
// sendRetainerForSignature and the public signing actions in lock-step.
async function loadSignatureSnapshotInputs(args: {
  clientId: string;
  rcicStaffId: string;
}) {
  const supabase = await createClient();
  const [{ data: client }, { data: rcic }] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select(
        "legal_name_full, given_names, family_name, address_line1, address_line2, city, province_state, postal_code, country_code, email, phone_primary",
      )
      .eq("id", args.clientId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("crm")
      .from("staff")
      .select(
        "first_name, last_name, email, signature_image_url, printed_name_for_signature, rcic_membership_number, office_address, office_phone, cell_phone",
      )
      .eq("id", args.rcicStaffId)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  return { client, rcic };
}

function buildClientAddress(c: {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  country_code: string | null;
}): string {
  return [
    c.address_line1,
    c.address_line2,
    [c.city, c.province_state].filter(Boolean).join(", "),
    [c.postal_code, c.country_code].filter(Boolean).join(" "),
  ]
    .filter((s) => s && s.trim() !== "")
    .join(", ")
    .trim();
}

// Builds the *_at_signing snapshot dict from live client + RCIC rows.
// Called from any path that flips a retainer out of `draft` (Send,
// Get-link). Keeping it as one function ensures the column set stays in
// lock-step regardless of which entry point fires.
async function buildRetainerSnapshotFields(args: {
  clientId: string;
  rcicStaffId: string;
}): Promise<
  | {
      ok: true;
      fields: RetainerUpdate;
    }
  | { error: string }
> {
  const snap = await loadSignatureSnapshotInputs(args);
  if (!snap.client) return { error: "Client record missing for this case." };
  if (!snap.rcic) return { error: "RCIC record missing." };

  const clientAddress = buildClientAddress(snap.client);
  const rcicFullName =
    `${snap.rcic.first_name} ${snap.rcic.last_name}`.trim();

  return {
    ok: true,
    fields: {
      client_legal_name_full_at_signing: snap.client.legal_name_full,
      client_given_names_at_signing: snap.client.given_names,
      client_family_name_at_signing: snap.client.family_name,
      client_address_at_signing: clientAddress || null,
      client_email_at_signing: snap.client.email,
      client_phone_at_signing: snap.client.phone_primary,
      rcic_name_at_signing: rcicFullName,
      rcic_given_name_at_signing: snap.rcic.first_name,
      rcic_family_name_at_signing: snap.rcic.last_name,
      rcic_membership_number_at_signing: snap.rcic.rcic_membership_number,
      rcic_address_at_signing: snap.rcic.office_address,
      rcic_phone_at_signing:
        snap.rcic.cell_phone ?? snap.rcic.office_phone ?? null,
      rcic_office_phone_at_signing: snap.rcic.office_phone,
      rcic_cell_phone_at_signing: snap.rcic.cell_phone,
      rcic_email_at_signing: snap.rcic.email,
      rcic_signature_image_url_at_signing: snap.rcic.signature_image_url,
      rcic_printed_name_at_signing: snap.rcic.printed_name_for_signature,
    },
  };
}

function clientGreetingName(c: {
  preferred_name: string | null;
  given_names: string | null;
  legal_name_full: string;
} | null): string {
  if (!c) return "there";
  return c.preferred_name?.trim() || c.given_names?.trim() || c.legal_name_full;
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
  | { ok: true; rcicStaffId: string }
  | {
      error: string;
      code?:
        | "rcic_signature_missing"
        | "rcic_not_assigned"
        | "client_incomplete";
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

  // Client completeness gate — the retainer renders legal name, address,
  // email, and phone. A lead created from an appointment booking will
  // only have name + email + phone; address fields will be blank. Sending
  // a retainer with missing identity/contact data is unprofessional and
  // creates legal issues, so we block it here.
  const { data: clientForGate } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      "legal_name_full, given_names, family_name, email, phone_primary, address_line1, city, province_state, postal_code",
    )
    .eq("id", ctx.caseRow.client_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (clientForGate) {
    const missing: string[] = [];
    if (!clientForGate.legal_name_full?.trim()) missing.push("full legal name");
    if (!clientForGate.given_names?.trim()) missing.push("given name");
    if (!clientForGate.family_name?.trim()) missing.push("family name");
    if (!clientForGate.email?.trim()) missing.push("email");
    if (!clientForGate.phone_primary?.trim()) missing.push("phone");
    if (!clientForGate.address_line1?.trim()) missing.push("address");
    if (!clientForGate.city?.trim()) missing.push("city");
    if (!clientForGate.province_state?.trim()) missing.push("province");
    if (!clientForGate.postal_code?.trim()) missing.push("postal code");

    if (missing.length > 0) {
      return {
        error: `Client profile is incomplete — missing: ${missing.join(", ")}. Update the client's personal details before sending the retainer.`,
        code: "client_incomplete" as const,
      };
    }
  }

  return { ok: true, rcicStaffId };
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
): Promise<
  | { ok: true; signing_path: string; emailSent: boolean; emailError?: string }
  | { error: string }
> {
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
  const [serviceLabel, snap] = await Promise.all([
    resolveServiceLabel(supabase, ctx.caseRow.service_type_id),
    buildRetainerSnapshotFields({
      clientId: ctx.caseRow.client_id,
      rcicStaffId: pre.rcicStaffId,
    }),
  ]);
  if ("error" in snap) return { error: snap.error };

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
        ctx.retainer.service_description ?? serviceLabel ?? null,
      first_installment_cad: Number(firstInst),
      second_installment_cad: Number(secondInst),
      hst_cad: Number(hst),
      withdrawal_refund_floor_cad: Number(withdrawalFloor),
      government_fee_cad:
        ctx.retainer.government_fee_cad ??
        (ctx.caseRow.government_fee_cad !== null
          ? Number(ctx.caseRow.government_fee_cad)
          : 0),
      // Identity / contact / signature snapshots — once written, these
      // are the source of truth for rendering and never reread from the
      // live clients/staff rows. See migration
      // 20260506000001_retainer_signing_snapshots.sql.
      ...snap.fields,
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

  // Best-effort transactional email. Failures never roll back the
  // signing-token write — staff can always copy the link from the UI.
  let emailSent = false;
  let emailError: string | undefined;
  if (parsed.data.send_email) {
    const client = await loadClient(ctx.caseRow.client_id);
    const limited = await shouldRateLimit(
      "retainer_invite",
      parsed.data.recipient_email,
    );
    if (limited) {
      emailError = "Rate limit reached for this recipient. Try again later.";
    } else {
      const baseUrl = await getBaseUrl();
      const signingUrl = `${baseUrl}/sign/retainer/${token}`;
      const tpl = retainerInviteEmail({
        clientName: clientGreetingName(client),
        caseNumber: ctx.caseRow.case_number,
        signingUrl,
        expiryDate: new Date(expires),
      });
      const res = await sendEmail({
        to: parsed.data.recipient_email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      emailSent = res.ok;
      if (!res.ok) emailError = res.error;
      await logEmail({
        supabase,
        caseId: ctx.caseRow.id,
        clientId: ctx.caseRow.client_id,
        staffId: g.me.id,
        to: parsed.data.recipient_email,
        subject: tpl.subject,
        body: tpl.text,
      });
    }
  }

  rev(ctx.caseRow.id);
  return {
    ok: true,
    signing_path: `/sign/retainer/${token}`,
    emailSent,
    emailError,
  };
}

// ---------------------------------------------------------------------------
// resendRetainerEmail
// ---------------------------------------------------------------------------

export async function resendRetainerEmail(
  retainerId: string,
): Promise<
  | { ok: true; signing_path: string; emailSent: boolean; emailError?: string }
  | { error: string }
> {
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

  // First-set-wins backfill: if this retainer was activated before the
  // snapshot columns existed (or via a path that didn't populate them),
  // populate now so a Resend locks the data even if Send didn't.
  let snapshotFields: RetainerUpdate = {};
  if (!ctx.retainer.client_legal_name_full_at_signing) {
    const pre = await prepareRetainerForSending(retainerId);
    if (!("error" in pre)) {
      const snap = await buildRetainerSnapshotFields({
        clientId: ctx.caseRow.client_id,
        rcicStaffId: pre.rcicStaffId,
      });
      if (!("error" in snap)) snapshotFields = snap.fields;
    }
  }

  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      resent_count: (ctx.retainer.resent_count ?? 0) + 1,
      last_resent_at: new Date().toISOString(),
      token_expires_at: expires,
      ...snapshotFields,
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

  // Re-fire the invite email if we still have the original recipient.
  let emailSent = false;
  let emailError: string | undefined;
  const recipient = ctx.retainer.sent_to_email;
  if (recipient) {
    const limited = await shouldRateLimit("retainer_invite", recipient);
    if (limited) {
      emailError = "Rate limit reached for this recipient. Try again later.";
    } else {
      const client = await loadClient(ctx.caseRow.client_id);
      const baseUrl = await getBaseUrl();
      const signingUrl = `${baseUrl}/sign/retainer/${ctx.retainer.signing_token}`;
      const tpl = retainerInviteEmail({
        clientName: clientGreetingName(client),
        caseNumber: ctx.caseRow.case_number,
        signingUrl,
        expiryDate: new Date(expires),
        isResend: true,
      });
      const res = await sendEmail({
        to: recipient,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      });
      emailSent = res.ok;
      if (!res.ok) emailError = res.error;
      await logEmail({
        supabase,
        caseId: ctx.caseRow.id,
        clientId: ctx.caseRow.client_id,
        staffId: g.me.id,
        to: recipient,
        subject: tpl.subject,
        body: tpl.text,
      });
    }
  } else {
    emailError = "No recipient on file — copy the link manually.";
  }

  rev(ctx.caseRow.id);
  return {
    ok: true,
    signing_path: `/sign/retainer/${ctx.retainer.signing_token}`,
    emailSent,
    emailError,
  };
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

  // First-set-wins snapshots: this path also leaves draft, so populate
  // *_at_signing if they aren't already set. Without this, a retainer
  // activated via Get-link (rather than Send) would render live data
  // and silently follow edits to the live clients/staff rows.
  let snapshotFields: RetainerUpdate = {};
  if (!ctx.retainer.client_legal_name_full_at_signing) {
    const snap = await buildRetainerSnapshotFields({
      clientId: ctx.caseRow.client_id,
      rcicStaffId: pre.rcicStaffId,
    });
    if ("error" in snap) return { error: snap.error };
    snapshotFields = snap.fields;
  }

  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "pending_signature",
      method: "online_signature",
      signing_token: token,
      token_expires_at: expires,
      ...snapshotFields,
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
  const voidedAt = new Date().toISOString();
  const { error } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      status: "void",
      void_reason: parsed.data.reason,
      voided_at: voidedAt,
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

  // Close the case — voiding a retainer is a real-world reset; the
  // case itself is no longer active. Use the canonical closed state +
  // closed_at timestamp; the cases-list filter hides closed by
  // default (archive semantic).
  await supabase
    .schema("crm")
    .from("cases")
    .update({
      status: "closed",
      closed_at: voidedAt,
    })
    .eq("id", ctx.caseRow.id);

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: ctx.caseRow.id,
      event_type: "status_changed",
      event_data: {
        from: ctx.caseRow.status ?? null,
        to: "closed",
        reason: "retainer_voided",
      },
      description: "Case closed due to retainer void.",
      created_by: me.id,
    });

  // Best-effort void PDF generation. Failures must not roll back the
  // void (the retainer status is the legal artifact; the PDF is a
  // convenience copy for the OneDrive folder). Skipped silently if the
  // case has no OneDrive folder yet.
  try {
    if (ctx.caseRow.sharepoint_folder_id) {
      const pdf = await renderRetainerPdf(parsed.data.retainerId, {
        mode: "void",
        voidedAt,
      });
      const today = voidedAt.slice(0, 10);
      const fileName = `Retainer_VOID_${today}.pdf`;
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
      await supabase
        .schema("files")
        .from("documents")
        .insert({
          case_id: ctx.caseRow.id,
          category: "retainer_void",
          document_code: "VOIDED_RETAINER",
          display_name: `Voided Retainer Agreement (${today})`,
          file_name: fileName,
          file_size_bytes: pdf.byteLength,
          mime_type: "application/pdf",
          sharepoint_drive_id: folder.driveId,
          sharepoint_item_id: uploaded.id,
          sharepoint_web_url: uploaded.webUrl,
          status: "accepted",
          uploaded_by_staff: me.id,
        });
    }
  } catch (err) {
    console.error(
      `[voidRetainer] void PDF generation failed for ${parsed.data.retainerId}:`,
      err,
    );
  }

  rev(ctx.caseRow.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// startNewRetainer — opens a NEW case that continues the work from a
// case whose retainer was voided. The original case stays as-is for
// audit (status closed, void retainer attached); the new case inherits
// every reusable detail (client, service, fees, RCIC, flags) so the
// staff member doesn't have to retype the wizard. Unique IDs
// (case_number, retainer id, OneDrive folder) are freshly generated.
//
// Why a new case rather than reactivating the existing retainer:
//   - retainer_agreements.case_id is a true UNIQUE constraint; soft-
//     deleting the void row doesn't free it because the constraint
//     applies regardless of deleted_at.
//   - Voiding a contract is a real-world reset; conflating it with a
//     re-draft on the same case obscures the audit trail.
// ---------------------------------------------------------------------------

export async function startNewRetainer(
  caseId: string,
): Promise<
  | { ok: true; newCaseId: string; newCaseNumber: string }
  | { error: string }
> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();

  const { data: oldCase } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id, case_number, client_id, service_type_id, service_template_id,
        assigned_rcic, assigned_paralegal,
        quoted_fee_cad, retainer_minimum_cad, government_fee_cad,
        conditional_flags, priority, internal_notes
      `,
    )
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!oldCase) return { error: "Original case not found" };

  // Look up the client's residence so we can re-apply the country-
  // based HST gate when seeding the new retainer below. The wizard
  // has an apply_hst checkbox for the initial case-creation path,
  // but a void+restart has no wizard step — the new retainer is
  // entirely auto-provisioned, so the country check has to live
  // here. Otherwise a non-CA client whose original retainer had
  // hst_cad=0 would silently get charged 13% on the restart.
  const { data: clientForHst } = await supabase
    .schema("crm")
    .from("clients")
    .select("country_of_residence")
    .eq("id", oldCase.client_id)
    .maybeSingle();

  const { data: existingRetainer } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, status")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!existingRetainer) {
    return { error: "No retainer found on the original case." };
  }
  if (existingRetainer.status !== "void") {
    return {
      error:
        "Void the current retainer before starting a new one.",
    };
  }

  // Mint a new case number via the same RPC the wizard uses.
  const { data: newCaseNumber, error: numErr } = await supabase
    .schema("crm")
    .rpc("generate_case_number");
  if (numErr || !newCaseNumber) {
    return {
      error: `Could not generate case number: ${numErr?.message ?? "unknown"}`,
    };
  }

  // Insert the cloned case. The trg_ensure_retainer_for_new_case
  // trigger creates a fresh draft retainer row automatically.
  const { data: newCase, error: caseErr } = await supabase
    .schema("crm")
    .from("cases")
    .insert({
      case_number: newCaseNumber as unknown as string,
      client_id: oldCase.client_id,
      service_type_id: oldCase.service_type_id,
      service_template_id: oldCase.service_template_id,
      assigned_rcic: oldCase.assigned_rcic,
      assigned_paralegal: oldCase.assigned_paralegal,
      status: "retainer_pending",
      quoted_fee_cad: oldCase.quoted_fee_cad,
      retainer_minimum_cad: oldCase.retainer_minimum_cad,
      government_fee_cad: oldCase.government_fee_cad,
      conditional_flags: oldCase.conditional_flags,
      priority: oldCase.priority,
      internal_notes: oldCase.internal_notes,
      sharepoint_folder_id: null,
      sharepoint_folder_url: null,
      created_by: g.me.id,
    })
    .select("id")
    .single();
  if (caseErr || !newCase) {
    return {
      error: `Could not create case: ${caseErr?.message ?? "unknown"}`,
    };
  }

  // Stamp rcic_id on the new (auto-created) retainer so loadRetainerData
  // resolves it directly. Mirrors the same step in createCase. Also
  // enforces the HST country gate: when the client is not in Canada,
  // hst_cad is set to 0 so the renderer's 13%-default doesn't kick
  // in. Canadian (and unknown country) clients leave hst_cad NULL so
  // the renderer applies 13%; staff can still override via the
  // RetainerDetailsForm before sending.
  const residence = clientForHst?.country_of_residence;
  const applyHst = residence === null || residence === undefined || residence === "CA";
  await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({
      rcic_id: oldCase.assigned_rcic,
      ...(applyHst ? {} : { hst_cad: 0 }),
    })
    .eq("case_id", newCase.id)
    .is("deleted_at", null);

  // Audit on both cases — the trail makes the continuation explicit.
  await supabase
    .schema("crm")
    .from("case_events")
    .insert([
      {
        case_id: caseId,
        event_type: "other",
        event_data: {
          kind: "retainer_restart",
          new_case_id: newCase.id,
          new_case_number: newCaseNumber,
        },
        description: `Retainer voided; continuation opened as ${newCaseNumber}.`,
        created_by: g.me.id,
      },
      {
        case_id: newCase.id,
        event_type: "status_changed",
        event_data: {
          from: null,
          to: "retainer_pending",
          source_case_id: caseId,
          source_case_number: oldCase.case_number,
        },
        description: `Case opened (continuation of ${oldCase.case_number}).`,
        created_by: g.me.id,
      },
    ]);

  // Best-effort OneDrive provisioning. Same pattern as createCase —
  // failures don't roll back the case row; staff can retry from the
  // new case detail page.
  try {
    const { driveItemId, webUrl } =
      await createCaseFolderStructure(newCase.id);
    await supabase
      .schema("crm")
      .from("cases")
      .update({
        sharepoint_folder_id: driveItemId,
        sharepoint_folder_url: webUrl,
      })
      .eq("id", newCase.id);
  } catch (err) {
    console.error(
      `[startNewRetainer] OneDrive provisioning failed for ${newCase.id}:`,
      err,
    );
    await supabase
      .schema("crm")
      .from("case_events")
      .insert({
        case_id: newCase.id,
        event_type: "other",
        event_data: {
          kind: "onedrive_folder_pending",
          error: err instanceof Error ? err.message : String(err),
        },
        description: "OneDrive folder creation failed; awaiting retry",
        created_by: g.me.id,
      });
  }

  rev(caseId);
  return {
    ok: true,
    newCaseId: newCase.id,
    newCaseNumber: newCaseNumber as unknown as string,
  };
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

// ---------------------------------------------------------------------------
// resaveSignedRetainerToOneDrive
//
// Backup path for the rare case where the online-signing flow's PDF
// upload silently failed (Graph blip, rate limit, missing env var on
// prod). The retainer row ends up status='signed' but
// final_document_id IS NULL — the app shows it as signed but the
// "00 Retainer" OneDrive folder has nothing.
//
// This action re-runs the same render + upload + link pipeline that
// the original online-signing flow ran. Only valid when:
//   * status = 'signed' (online signature path — not 'uploaded', which
//     is the staff-uploaded-scan path; we don't have the original
//     file to re-upload there)
//   * final_document_id IS NULL
// Idempotent under racing clicks because the staff page reloads after
// each call and the precondition disappears.
// ---------------------------------------------------------------------------

export type ResaveSignedRetainerResult =
  | { ok: true; documentId: string; webUrl: string | null }
  | { error: string };

export async function resaveSignedRetainerToOneDrive(
  retainerId: string,
): Promise<ResaveSignedRetainerResult> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  if (!z.string().uuid().safeParse(retainerId).success) {
    return { error: "Invalid retainer id" };
  }

  const supabase = await createClient();
  const { data: retainerRow } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, case_id, status, final_document_id")
    .eq("id", retainerId)
    .maybeSingle();
  if (!retainerRow) return { error: "Retainer not found" };
  if (retainerRow.status !== "signed") {
    return {
      error:
        "This retainer isn't in the signed state. The resave path only handles online-signed retainers whose PDF upload failed.",
    };
  }
  if (retainerRow.final_document_id) {
    return {
      error:
        "This retainer already has a saved PDF on file. Refresh the page to see the OneDrive link.",
    };
  }

  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, sharepoint_folder_id")
    .eq("id", retainerRow.case_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow) return { error: "Case not found" };
  if (!caseRow.sharepoint_folder_id) {
    return {
      error:
        "OneDrive folder isn't provisioned for this case yet. Open the OneDrive card and retry folder creation first.",
    };
  }

  // Render the PDF from the persisted retainer + the captured client
  // signature image. Same renderer the online-signing flow uses; the
  // output is byte-identical for a given retainer state.
  let pdf: Uint8Array;
  try {
    pdf = await renderRetainerPdf(retainerId);
  } catch (err) {
    return {
      error: `Could not render the retainer PDF: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  let folderDriveId: string;
  let folderItemId: string;
  try {
    const folder = await ensureCaseRetainerFolder(caseRow.sharepoint_folder_id);
    folderDriveId = folder.driveId;
    folderItemId = folder.folderItemId;
  } catch (err) {
    return {
      error: `Could not access OneDrive folder: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `Retainer_Signed_${today}.pdf`;

  let uploaded;
  try {
    uploaded = await uploadFile(
      folderDriveId,
      folderItemId,
      fileName,
      pdf,
      "application/pdf",
    );
  } catch (err) {
    return {
      error: `OneDrive upload failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const { data: doc, error: docErr } = await supabase
    .schema("files")
    .from("documents")
    .insert({
      case_id: caseRow.id,
      category: "retainer",
      document_code: "SIGNED_RETAINER",
      display_name: "Signed Retainer Agreement",
      file_name: fileName,
      file_size_bytes: pdf.byteLength,
      mime_type: "application/pdf",
      sharepoint_drive_id: folderDriveId,
      sharepoint_item_id: uploaded.id,
      sharepoint_web_url: uploaded.webUrl,
      status: "accepted",
      // Backup save was triggered by staff after the auto-upload
      // failed at signing time. Attribution goes to staff so the
      // audit trail is honest about who pushed the bytes.
      uploaded_by_staff: g.me.id,
    })
    .select("id")
    .single();
  if (docErr || !doc) {
    return {
      error: `Could not record document: ${docErr?.message ?? "unknown"}`,
    };
  }

  const { error: linkErr } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .update({ final_document_id: doc.id })
    .eq("id", retainerId);
  if (linkErr) return { error: linkErr.message };

  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseRow.id,
      event_type: "retainer_uploaded",
      description:
        "Signed retainer PDF re-saved to OneDrive (manual backup save).",
      event_data: {
        document_id: doc.id,
        sharepoint_web_url: uploaded.webUrl,
        backup_save: true,
      },
      created_by: g.me.id,
    });

  rev(caseRow.id);
  return { ok: true, documentId: doc.id, webUrl: uploaded.webUrl };
}
