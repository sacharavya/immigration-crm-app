import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { streamFileFromGraph } from "@/lib/graph/download";

import {
  sendEmail,
  validateAttachments,
  type EmailAttachment,
} from "./client";
import { logEmail } from "./log";
import { getBaseUrl } from "./url";
import { caseDecisionEmail } from "./templates/case-decision";
import { caseEventNotificationEmail } from "./templates/case-event-notification";
import { casePhaseAdvanceEmail } from "./templates/case-phase-advance";

// `warning` carries a non-fatal problem the caller should surface to staff —
// e.g. the email sent but a "from case files" attachment couldn't be fetched.
export type CaseEmailResult =
  | { ok: true; warning?: string }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Load case + client for email context
// ---------------------------------------------------------------------------

type CaseEmailContext = {
  caseId: string;
  caseNumber: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceTypeName: string;
};

async function loadCaseEmailContext(
  supabase: SupabaseClient<Database>,
  caseId: string,
): Promise<CaseEmailContext | null> {
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, case_number, client_id, service_type_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow?.client_id) return null;

  const { data: client } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, legal_name_full, given_names, preferred_name, email")
    .eq("id", caseRow.client_id)
    .maybeSingle();
  if (!client?.email) return null;

  let serviceTypeName = "Immigration";
  if (caseRow.service_type_id) {
    const { data: st } = await supabase
      .schema("ref")
      .from("service_types")
      .select("name")
      .eq("id", caseRow.service_type_id)
      .maybeSingle();
    if (st?.name) serviceTypeName = st.name;
  }

  const clientName =
    client.preferred_name || client.given_names || client.legal_name_full || "Client";

  return {
    caseId: caseRow.id,
    caseNumber: caseRow.case_number,
    clientId: client.id,
    clientName,
    clientEmail: client.email,
    serviceTypeName,
  };
}

// ---------------------------------------------------------------------------
// Download a case document as a Buffer for email attachment
// ---------------------------------------------------------------------------

async function downloadDocumentBuffer(
  supabase: SupabaseClient<Database>,
  documentId: string,
): Promise<EmailAttachment | null> {
  const { data: doc } = await supabase
    .schema("files")
    .from("documents")
    .select("sharepoint_drive_id, sharepoint_item_id, file_name, mime_type")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc?.sharepoint_drive_id || !doc.sharepoint_item_id) return null;

  try {
    const streamed = await streamFileFromGraph(
      doc.sharepoint_drive_id,
      doc.sharepoint_item_id,
    );
    const chunks: Uint8Array[] = [];
    const reader = streamed.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    return {
      filename: doc.file_name ?? "attachment",
      content: buffer,
    };
  } catch (err) {
    console.error("[case-notifications] document download failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1. Decision email (approved / refused)
// ---------------------------------------------------------------------------

export async function sendCaseDecisionEmail(
  supabase: SupabaseClient<Database>,
  caseId: string,
  outcome: "approved" | "refused",
  opts?: {
    staffNote?: string;
    attachments?: EmailAttachment[];
    staffId?: string;
    attachmentDocId?: string;
  },
): Promise<CaseEmailResult> {
  const ctx = await loadCaseEmailContext(supabase, caseId);
  if (!ctx) return { ok: false, reason: "case_or_client_not_found" };

  const allAttachments = [...(opts?.attachments ?? [])];

  // Download existing document if specified. A failed fetch must not silently
  // send a fileless email — track it and warn the caller.
  let warning: string | undefined;
  if (opts?.attachmentDocId) {
    const docAttachment = await downloadDocumentBuffer(
      supabase,
      opts.attachmentDocId,
    );
    if (docAttachment) allAttachments.push(docAttachment);
    else warning = "A selected case file couldn't be fetched and was not attached.";
  }

  const sizeError = validateAttachments(allAttachments);
  if (sizeError) return { ok: false, reason: sizeError };

  const tpl = caseDecisionEmail({
    clientName: ctx.clientName,
    caseNumber: ctx.caseNumber,
    serviceType: ctx.serviceTypeName,
    outcome,
    staffNote: opts?.staffNote,
    hasAttachment: allAttachments.length > 0,
    consultationUrl: `${await getBaseUrl()}/book-an-appointment`,
  });

  const res = await sendEmail({
    to: ctx.clientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: allAttachments.length > 0 ? allAttachments : undefined,
  });

  if (!res.ok) {
    console.error("[case-notifications] decision email failed:", res.error);
    return { ok: false, reason: res.error };
  }

  await logEmail({
    supabase,
    caseId: ctx.caseId,
    clientId: ctx.clientId,
    staffId: opts?.staffId,
    to: ctx.clientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true, warning };
}

// ---------------------------------------------------------------------------
// 2. Case event notification email
// ---------------------------------------------------------------------------

export async function sendCaseEventEmail(
  supabase: SupabaseClient<Database>,
  caseId: string,
  eventType: string,
  opts?: {
    staffNote?: string;
    attachments?: EmailAttachment[];
    staffId?: string;
    attachmentDocId?: string;
    scheduledDate?: string;
    location?: string;
    whatWasAsked?: string;
    documentList?: string[];
    dueDate?: string;
  },
): Promise<CaseEmailResult> {
  const ctx = await loadCaseEmailContext(supabase, caseId);
  if (!ctx) return { ok: false, reason: "case_or_client_not_found" };

  const allAttachments = [...(opts?.attachments ?? [])];
  let warning: string | undefined;
  if (opts?.attachmentDocId) {
    const docAttachment = await downloadDocumentBuffer(
      supabase,
      opts.attachmentDocId,
    );
    if (docAttachment) allAttachments.push(docAttachment);
    else warning = "A selected case file couldn't be fetched and was not attached.";
  }

  const sizeError = validateAttachments(allAttachments);
  if (sizeError) return { ok: false, reason: sizeError };

  const tpl = caseEventNotificationEmail({
    clientName: ctx.clientName,
    caseNumber: ctx.caseNumber,
    eventType: eventType as Parameters<typeof caseEventNotificationEmail>[0]["eventType"],
    staffNote: opts?.staffNote,
    hasAttachment: allAttachments.length > 0,
    scheduledDate: opts?.scheduledDate,
    location: opts?.location,
    whatWasAsked: opts?.whatWasAsked,
    documentList: opts?.documentList,
    dueDate: opts?.dueDate,
  });

  const res = await sendEmail({
    to: ctx.clientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: allAttachments.length > 0 ? allAttachments : undefined,
  });

  if (!res.ok) {
    console.error("[case-notifications] event email failed:", res.error);
    return { ok: false, reason: res.error };
  }

  await logEmail({
    supabase,
    caseId: ctx.caseId,
    clientId: ctx.clientId,
    staffId: opts?.staffId,
    to: ctx.clientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true, warning };
}

// ---------------------------------------------------------------------------
// 3. Phase advance notification email
// ---------------------------------------------------------------------------

export async function sendCasePhaseAdvanceEmail(
  supabase: SupabaseClient<Database>,
  caseId: string,
  fromPhaseLabel: string,
  toPhaseLabel: string,
  opts?: {
    staffNote?: string;
    staffId?: string;
    attachments?: EmailAttachment[];
    attachmentDocId?: string;
  },
): Promise<CaseEmailResult> {
  const ctx = await loadCaseEmailContext(supabase, caseId);
  if (!ctx) return { ok: false, reason: "case_or_client_not_found" };

  // Previously this path dropped attachments entirely — files attached to a
  // non-decision phase-advance email never reached the client. Now they flow
  // through the same as the decision/event emails.
  const allAttachments = [...(opts?.attachments ?? [])];
  let warning: string | undefined;
  if (opts?.attachmentDocId) {
    const docAttachment = await downloadDocumentBuffer(
      supabase,
      opts.attachmentDocId,
    );
    if (docAttachment) allAttachments.push(docAttachment);
    else warning = "A selected case file couldn't be fetched and was not attached.";
  }

  const sizeError = validateAttachments(allAttachments);
  if (sizeError) return { ok: false, reason: sizeError };

  const tpl = casePhaseAdvanceEmail({
    clientName: ctx.clientName,
    caseNumber: ctx.caseNumber,
    serviceType: ctx.serviceTypeName,
    fromPhaseLabel,
    toPhaseLabel,
    staffNote: opts?.staffNote,
  });

  const res = await sendEmail({
    to: ctx.clientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: allAttachments.length > 0 ? allAttachments : undefined,
  });

  if (!res.ok) {
    console.error("[case-notifications] phase advance email failed:", res.error);
    return { ok: false, reason: res.error };
  }

  await logEmail({
    supabase,
    caseId: ctx.caseId,
    clientId: ctx.clientId,
    staffId: opts?.staffId,
    to: ctx.clientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true, warning };
}
