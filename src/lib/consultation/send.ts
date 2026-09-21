import { getBaseUrl } from "@/lib/email/url";
import { randomBytes } from "node:crypto";

import { sendEmail } from "@/lib/email/client";
import { consultationAgreementInviteEmail } from "@/lib/email/templates/consultation-agreement-invite";
import { adminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof adminClient>;

const TOKEN_TTL_DAYS = 14;

// A client is "existing" (no consultation agreement needed) once they've signed
// a genzdatalabs Immigration retainer — they agreed to terms there. Matches by email.
async function clientHasSignedRetainer(
  supabase: Admin,
  email: string,
): Promise<boolean> {
  const { data: clients } = await supabase
    .schema("crm")
    .from("clients")
    .select("id")
    .eq("email", email.toLowerCase())
    .is("deleted_at", null);
  const clientIds = (clients ?? []).map((c) => c.id);
  if (clientIds.length === 0) return false;

  const { data: cases } = await supabase
    .schema("crm")
    .from("cases")
    .select("id")
    .in("client_id", clientIds)
    .is("deleted_at", null);
  const caseIds = (cases ?? []).map((c) => c.id);
  if (caseIds.length === 0) return false;

  const { count } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id", { count: "exact", head: true })
    .in("case_id", caseIds)
    .eq("status", "signed");
  return (count ?? 0) > 0;
}

// After a booking: if the type requires the agreement and the client is a
// first-time (non-retained) client, mint a token and email a sign-link.
// Idempotent + best-effort — never throws into the booking flow.
// Returns the sign-link URL when it just sent one (so the caller can also
// prompt inline), or null when no agreement was needed / already handled.
export async function maybeSendConsultationAgreement(
  supabase: Admin,
  appointmentId: string,
): Promise<string | null> {
  try {
    const { data: appt } = await supabase
      .schema("crm")
      .from("appointments")
      .select(
        "id, snapshot_client_name, snapshot_client_email, appointment_type_id, consultation_agreement_signed_at, consultation_agreement_token",
      )
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appt) return null;
    if (appt.consultation_agreement_signed_at || appt.consultation_agreement_token) {
      return null; // already signed or already sent
    }

    // The agreement is part of EVERY booking flow (user decision 2026-08-20):
    // the per-type opt-out is gone. Retained clients still skip below.

    if (await clientHasSignedRetainer(supabase, appt.snapshot_client_email)) {
      return null; // existing client — already agreed to terms via a retainer
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000);

    // Claim the token atomically so a double-fire can't send two emails.
    const { data: claimed } = await supabase
      .schema("crm")
      .from("appointments")
      .update({
        consultation_agreement_token: token,
        consultation_agreement_token_expires_at: expiresAt.toISOString(),
        consultation_agreement_sent_at: new Date().toISOString(),
      })
      .eq("id", appt.id)
      .is("consultation_agreement_token", null)
      .select("id")
      .maybeSingle();
    if (!claimed) return null; // lost the race

    // A token link: lives on the app host like every other one.
    const signingUrl = `${await getBaseUrl()}/sign/consultation/${token}`;
    const email = consultationAgreementInviteEmail({
      clientName: appt.snapshot_client_name,
      signingUrl,
      expiryDate: expiresAt,
    });
    await sendEmail({
      to: appt.snapshot_client_email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    return signingUrl;
  } catch (err) {
    console.error("[maybeSendConsultationAgreement] failed:", err);
    return null;
  }
}
