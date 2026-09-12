// Pure RFC 5545 iCalendar builder. Used by the email helpers to attach an
// .ics to confirmation / reschedule / reminder / cancellation emails so
// attendees on Gmail / Apple Mail / Outlook can add the event to their
// personal calendar regardless of whether they're on the firm's M365 tenant.
//
// Reschedules bump SEQUENCE so calendars adopt the new time as an update of
// the same event (UID is appointment.id, stable across reschedules).
// Cancellations send STATUS:CANCELLED + METHOD:CANCEL so participating
// calendars can auto-remove.

export type IcsInput = {
  uid: string;
  subject: string;
  description: string;
  starts_at: string; // ISO datetime
  ends_at: string; // ISO datetime
  location: string;
  organizer_email: string;
  organizer_name: string;
  attendee_email: string;
  attendee_name: string;
  status?: "CONFIRMED" | "CANCELLED";
  sequence?: number;
  // APPT-7: when present, the .ics LOCATION line surfaces the Teams join
  // URL (so calendar clients render it clickable) and the DESCRIPTION
  // appends a "Join via Microsoft Teams: <url>" line. Optional — leave
  // unset to fall back to the plain `location` value.
  teams_join_url?: string | null;
};

function fmtUtc(iso: string): string {
  // YYYYMMDDTHHMMSSZ
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

export function buildIcs(input: IcsInput): string {
  const status = input.status ?? "CONFIRMED";
  const method = status === "CANCELLED" ? "CANCEL" : "REQUEST";

  const effectiveLocation = input.teams_join_url
    ? `Microsoft Teams meeting: ${input.teams_join_url}`
    : input.location;
  const effectiveDescription = input.teams_join_url
    ? `${input.description}\n\nJoin via Microsoft Teams: ${input.teams_join_url}`
    : input.description;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//genzdatalabs Immigration//CRM//EN",
    `METHOD:${method}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@genzdatalabs.com`,
    `DTSTAMP:${fmtUtc(new Date().toISOString())}`,
    `DTSTART:${fmtUtc(input.starts_at)}`,
    `DTEND:${fmtUtc(input.ends_at)}`,
    `SUMMARY:${escapeText(input.subject)}`,
    `DESCRIPTION:${escapeText(effectiveDescription)}`,
    `LOCATION:${escapeText(effectiveLocation)}`,
    `STATUS:${status}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    `ORGANIZER;CN=${escapeText(input.organizer_name)}:mailto:${input.organizer_email}`,
    `ATTENDEE;CN=${escapeText(input.attendee_name)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${input.attendee_email}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // RFC 5545 requires CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}
