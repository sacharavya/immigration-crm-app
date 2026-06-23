import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildIcs } from "@/lib/appointments/ics";
import type { Database } from "@/lib/supabase/types";

import { sendEmail, type EmailAttachment } from "./client";
import { getBaseUrl } from "./url";
import { logEmail } from "./log";
import { shouldRateLimit } from "./rate-limit";
import { appointmentAbandonedEmail } from "./templates/appointment-abandoned";
import { appointmentCancellationEmail } from "./templates/appointment-cancellation";
import { appointmentConfirmationEmail } from "./templates/appointment-confirmation";
import {
  appointmentInternalNotificationEmail,
} from "./templates/appointment-internal-notification";
import { appointmentPaymentPendingEmail } from "./templates/appointment-payment-pending";
import { appointmentPaymentRejectedEmail } from "./templates/appointment-payment-rejected";
import { appointmentPaymentStaffNotificationEmail } from "./templates/appointment-payment-staff-notification";
import { appointmentReminderEmail } from "./templates/appointment-reminder";
import { appointmentRescheduleEmail } from "./templates/appointment-reschedule";

// Single point of fan-out for every appointment-related email. Each helper
// reads the appointment fresh, applies the per-template + per-recipient
// rate limit, fires sendEmail (which goes through Resend), logs to
// crm.communications, and returns a structured ok/reason result. Failures
// log but do NOT throw — the appointment is the source of truth and the
// underlying action stays committed.

export type EmailResult = { ok: true } | { ok: false; reason: string };

const FIRM_NAME = "Big Bang Immigration";
const FIRM_EMAIL = "info@bigbangimmigration.com";
// Fallback recipient when an appointment has no assigned RCIC (e.g. global
// public bookings). The prompt allows this to be hardcoded for v1; a
// settings-driven address can come later.
const INTERNAL_FALLBACK_EMAIL = "info@bigbangimmigration.com";

type AppointmentEmailRow = {
  id: string;
  case_id: string | null;
  client_id: string | null;
  snapshot_client_name: string;
  snapshot_client_email: string;
  snapshot_client_phone: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_type: "online" | "onsite";
  online_link: string | null;
  onsite_address: string | null;
  // APPT-7: when set, takes precedence over online_link for display and
  // gets surfaced as a "Teams meeting" call-to-action in the email + .ics.
  teams_join_url: string | null;
  // APPT-8: fee snapshot for paid consultations. Drives the payment-pending
  // and staff-notification emails.
  fee_cad_at_booking: number | string | null;
  reason: string;
  status: string;
  booking_source: string;
  management_token: string | null;
  graph_event_id: string | null;
  assigned_staff_id: string | null;
  appointment_type: { name: string; duration_minutes: number } | null;
  assigned_staff: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

async function loadAppointment(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<AppointmentEmailRow | null> {
  const { data } = await supabase
    .schema("crm")
    .from("appointments")
    .select(
      `
        id, case_id, client_id, snapshot_client_name, snapshot_client_email,
        snapshot_client_phone, starts_at, ends_at, timezone, location_type,
        online_link, onsite_address, teams_join_url, fee_cad_at_booking,
        reason, status, booking_source, management_token, graph_event_id,
        assigned_staff_id,
        appointment_type:appointment_types!appointments_appointment_type_id_fkey(
          name, duration_minutes
        ),
        assigned_staff:staff!appointments_assigned_staff_id_fkey(
          first_name, last_name, email
        )
      `,
    )
    .eq("id", appointmentId)
    .maybeSingle();
  return (data as unknown as AppointmentEmailRow) ?? null;
}

function formatForClient(iso: string, timezone: string) {
  const zoned = toZonedTime(new Date(iso), timezone);
  return {
    dateDisplay: format(zoned, "EEEE, MMMM d, yyyy"),
    timeDisplay: format(zoned, "h:mm a"),
    // Compact tz label — a future refinement can detect EDT vs EST at the
    // exact instant; for v1 the firm-wide label is enough.
    timezoneDisplay: "Toronto time",
  };
}

// getBaseUrl() is async (it reads request headers as a fallback when
// NEXT_PUBLIC_APP_URL is missing). Forgetting to await it stringifies
// the Promise into the email body — every recipient gets a link like
// `[object Promise]/book-an-appointment/manage/<token>`. Keep these helpers async to
// force every caller through await at the type level.
async function managementUrl(token: string | null): Promise<string | null> {
  if (!token) return null;
  return `${await getBaseUrl()}/book-an-appointment/manage/${token}`;
}

async function rebookUrl(): Promise<string> {
  return `${await getBaseUrl()}/book-an-appointment`;
}

async function dashboardUrl(appointmentId: string): Promise<string> {
  return `${await getBaseUrl()}/dashboard/appointments?id=${appointmentId}`;
}

function locationLineForIcs(row: AppointmentEmailRow): string {
  // APPT-7: the ics builder itself substitutes the Teams line when
  // teams_join_url is set, so here we just supply the plain fallback.
  if (row.location_type === "online") {
    return row.online_link ? `Online: ${row.online_link}` : "Online";
  }
  return row.onsite_address ?? "Big Bang Immigration office";
}

function attachmentForRow(
  row: AppointmentEmailRow,
  status: "CONFIRMED" | "CANCELLED",
  sequence: number,
): EmailAttachment {
  const typeName = row.appointment_type?.name ?? "Appointment";
  const ics = buildIcs({
    uid: row.id,
    subject: `${typeName} with ${FIRM_NAME}`,
    description: `Your ${typeName} with ${FIRM_NAME}.`,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: locationLineForIcs(row),
    organizer_email: FIRM_EMAIL,
    organizer_name: FIRM_NAME,
    attendee_email: row.snapshot_client_email,
    attendee_name: row.snapshot_client_name,
    status,
    sequence,
    teams_join_url: row.teams_join_url,
  });
  return { filename: "appointment.ics", content: Buffer.from(ics, "utf8") };
}

// ---------------------------------------------------------------------------
// 1. Confirmation (client)
// ---------------------------------------------------------------------------

export async function sendAppointmentConfirmation(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_confirmation",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const dates = formatForClient(row.starts_at, row.timezone);
  const typeName = row.appointment_type?.name ?? "Appointment";
  const durationMinutes = row.appointment_type?.duration_minutes ?? 30;

  const tpl = appointmentConfirmationEmail({
    clientName: row.snapshot_client_name,
    typeName,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    durationMinutes,
    locationType: row.location_type,
    onlineLink: row.online_link,
    onsiteAddress: row.onsite_address,
    teamsJoinUrl: row.teams_join_url,
    managementUrl: await managementUrl(row.management_token),
  });

  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: [attachmentForRow(row, "CONFIRMED", 0)],
  });
  if (!res.ok) {
    console.error(
      "[email.appointments] confirmation send failed:",
      res.error,
    );
    return { ok: false, reason: "send_failed" };
  }

  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// 2. Reschedule (client)
// ---------------------------------------------------------------------------

export async function sendAppointmentReschedule(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
  previousStartsAt: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_reschedule",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const previous = formatForClient(previousStartsAt, row.timezone);
  const next = formatForClient(row.starts_at, row.timezone);
  const typeName = row.appointment_type?.name ?? "Appointment";
  const durationMinutes = row.appointment_type?.duration_minutes ?? 30;

  const tpl = appointmentRescheduleEmail({
    clientName: row.snapshot_client_name,
    typeName,
    previousDateDisplay: previous.dateDisplay,
    previousTimeDisplay: previous.timeDisplay,
    newDateDisplay: next.dateDisplay,
    newTimeDisplay: next.timeDisplay,
    timezoneDisplay: next.timezoneDisplay,
    durationMinutes,
    locationType: row.location_type,
    onlineLink: row.online_link,
    onsiteAddress: row.onsite_address,
    teamsJoinUrl: row.teams_join_url,
    managementUrl: await managementUrl(row.management_token),
  });

  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    // SEQUENCE bumps so receiving calendars adopt the new time as an update
    // of the same UID.
    attachments: [attachmentForRow(row, "CONFIRMED", 1)],
  });
  if (!res.ok) {
    console.error(
      "[email.appointments] reschedule send failed:",
      res.error,
    );
    return { ok: false, reason: "send_failed" };
  }

  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// 3. Cancellation (client) — METHOD:CANCEL .ics so calendars auto-remove
// ---------------------------------------------------------------------------

export async function sendAppointmentCancellation(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_cancellation",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const dates = formatForClient(row.starts_at, row.timezone);
  const typeName = row.appointment_type?.name ?? "Appointment";

  const tpl = appointmentCancellationEmail({
    clientName: row.snapshot_client_name,
    typeName,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    // Rebook URL only makes sense when /book-an-appointment is reachable to this prospect;
    // safe to always include since the page itself respects the feature flag.
    rebookUrl: await rebookUrl(),
  });

  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: [attachmentForRow(row, "CANCELLED", 2)],
  });
  if (!res.ok) {
    console.error(
      "[email.appointments] cancellation send failed:",
      res.error,
    );
    return { ok: false, reason: "send_failed" };
  }

  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// 4. 24-hour reminder (client) — driven by the cron route
// ---------------------------------------------------------------------------

export async function sendAppointmentReminder(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "confirmed") {
    return { ok: false, reason: "not_confirmed" };
  }
  if (
    await shouldRateLimit(
      "appointment_reminder",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const dates = formatForClient(row.starts_at, row.timezone);
  const typeName = row.appointment_type?.name ?? "Appointment";
  const durationMinutes = row.appointment_type?.duration_minutes ?? 30;

  const tpl = appointmentReminderEmail({
    clientName: row.snapshot_client_name,
    typeName,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    durationMinutes,
    locationType: row.location_type,
    onlineLink: row.online_link,
    onsiteAddress: row.onsite_address,
    teamsJoinUrl: row.teams_join_url,
    managementUrl: await managementUrl(row.management_token),
  });

  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: [attachmentForRow(row, "CONFIRMED", 0)],
  });
  if (!res.ok) {
    console.error(
      "[email.appointments] reminder send failed:",
      res.error,
    );
    return { ok: false, reason: "send_failed" };
  }

  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// 5. Internal notification (staff)
// ---------------------------------------------------------------------------

export async function sendInternalNotification(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };

  const recipientEmail =
    row.assigned_staff?.email ?? INTERNAL_FALLBACK_EMAIL;
  const recipientFirstName = row.assigned_staff?.first_name ?? null;

  if (
    await shouldRateLimit(
      "appointment_internal_notification",
      recipientEmail,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }

  const dates = formatForClient(row.starts_at, row.timezone);
  const typeName = row.appointment_type?.name ?? "Appointment";
  const durationMinutes = row.appointment_type?.duration_minutes ?? 30;

  const tpl = appointmentInternalNotificationEmail({
    recipientFirstName,
    clientName: row.snapshot_client_name,
    clientEmail: row.snapshot_client_email,
    clientPhone: row.snapshot_client_phone,
    typeName,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    durationMinutes,
    locationType: row.location_type,
    reason: row.reason,
    bookingSource: row.booking_source,
    dashboardUrl: await dashboardUrl(row.id),
  });

  const res = await sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!res.ok) {
    console.error(
      "[email.appointments] internal notification send failed:",
      res.error,
    );
    return { ok: false, reason: "send_failed" };
  }

  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    staffId: row.assigned_staff_id ?? undefined,
    to: recipientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// APPT-8: paid-consultation helpers.
//
//   6. Payment pending (client) — fires right after a paid booking lands in
//      pending_payment status. Email is the backup path for clients who
//      close the booking-confirmation tab without uploading.
//   7. Staff notification (assigned RCIC or info@) — fires after the client
//      uploads payment proof, flipping status to awaiting_review.
//   8. Payment rejected (client) — fires after staff rejects the proof.
//   9. Abandoned booking (client) — fires from the daily cron when a
//      pending_payment row aged past the cutoff.
// ---------------------------------------------------------------------------

const PAYMENT_RECIPIENT_EMAIL = "info@bigbangimmigration.com";

export async function sendPaymentPending(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_payment_pending",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }
  if (!row.management_token) return { ok: false, reason: "no_token" };
  const fee = Number(row.fee_cad_at_booking ?? 0);
  if (fee <= 0) return { ok: false, reason: "not_paid" };

  const dates = formatForClient(row.starts_at, row.timezone);
  const tpl = appointmentPaymentPendingEmail({
    clientName: row.snapshot_client_name,
    typeName: row.appointment_type?.name ?? "Consultation",
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    durationMinutes: row.appointment_type?.duration_minutes ?? 30,
    feeCad: fee,
    feeRecipientEmail: PAYMENT_RECIPIENT_EMAIL,
    referenceCode: row.id.slice(0, 8),
    managementUrl:
      (await managementUrl(row.management_token)) ??
      `${await getBaseUrl()}/book-an-appointment`,
  });

  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!res.ok) {
    console.error("[email.appointments] payment_pending send failed:", res.error);
    return { ok: false, reason: "send_failed" };
  }
  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });
  return { ok: true };
}

export async function sendPaymentStaffNotification(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  const recipientEmail =
    row.assigned_staff?.email ?? INTERNAL_FALLBACK_EMAIL;
  const recipientFirstName = row.assigned_staff?.first_name ?? null;

  if (
    await shouldRateLimit(
      "appointment_payment_staff_notification",
      recipientEmail,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }
  const fee = Number(row.fee_cad_at_booking ?? 0);
  const dates = formatForClient(row.starts_at, row.timezone);
  const tpl = appointmentPaymentStaffNotificationEmail({
    recipientFirstName,
    clientName: row.snapshot_client_name,
    typeName: row.appointment_type?.name ?? "Consultation",
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    feeCad: fee,
    referenceCode: row.id.slice(0, 8),
    reviewUrl: await dashboardUrl(row.id),
  });

  const res = await sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!res.ok) {
    console.error("[email.appointments] payment_staff_notification send failed:", res.error);
    return { ok: false, reason: "send_failed" };
  }
  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    staffId: row.assigned_staff_id ?? undefined,
    to: recipientEmail,
    subject: tpl.subject,
    body: tpl.text,
  });
  return { ok: true };
}

export async function sendPaymentRejected(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
  rejectionReason: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_payment_rejected",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }
  const dates = formatForClient(row.starts_at, row.timezone);
  const tpl = appointmentPaymentRejectedEmail({
    clientName: row.snapshot_client_name,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    rejectionReason,
    bookAgainUrl: await rebookUrl(),
  });
  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!res.ok) {
    console.error("[email.appointments] payment_rejected send failed:", res.error);
    return { ok: false, reason: "send_failed" };
  }
  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });
  return { ok: true };
}

export async function sendAbandonedBooking(
  supabase: SupabaseClient<Database>,
  appointmentId: string,
): Promise<EmailResult> {
  const row = await loadAppointment(supabase, appointmentId);
  if (!row) return { ok: false, reason: "not_found" };
  if (
    await shouldRateLimit(
      "appointment_abandoned",
      row.snapshot_client_email,
    )
  ) {
    return { ok: false, reason: "rate_limited" };
  }
  const dates = formatForClient(row.starts_at, row.timezone);
  const tpl = appointmentAbandonedEmail({
    clientName: row.snapshot_client_name,
    dateDisplay: dates.dateDisplay,
    timeDisplay: dates.timeDisplay,
    timezoneDisplay: dates.timezoneDisplay,
    bookAgainUrl: await rebookUrl(),
  });
  const res = await sendEmail({
    to: row.snapshot_client_email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
  if (!res.ok) {
    console.error("[email.appointments] abandoned send failed:", res.error);
    return { ok: false, reason: "send_failed" };
  }
  await logEmail({
    supabase,
    caseId: row.case_id,
    clientId: row.client_id,
    to: row.snapshot_client_email,
    subject: tpl.subject,
    body: tpl.text,
  });
  return { ok: true };
}
