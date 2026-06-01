import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentRescheduleArgs = {
  clientName: string;
  typeName: string;
  previousDateDisplay: string;
  previousTimeDisplay: string;
  newDateDisplay: string;
  newTimeDisplay: string;
  timezoneDisplay: string;
  durationMinutes: number;
  locationType: "online" | "onsite";
  onlineLink: string | null;
  onsiteAddress: string | null;
  // APPT-7: Teams link stays the same across reschedules (Graph preserves
  // it), so the reschedule email surfaces the same join URL as the
  // original confirmation.
  teamsJoinUrl: string | null;
  managementUrl: string | null;
};

function onlineLocationHtml(args: AppointmentRescheduleArgs): string {
  if (args.teamsJoinUrl) {
    return `<p style="margin:0 0 8px 0;"><strong>Microsoft Teams meeting:</strong></p>
${buttonHtml("Join Teams meeting", args.teamsJoinUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:13px;">Same link as before — your existing calendar entry will update automatically.</p>`;
  }
  if (args.onlineLink) {
    return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> <a href="${escapeHtml(args.onlineLink)}">${escapeHtml(args.onlineLink)}</a></p>`;
  }
  return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> A link will be sent to you shortly before your appointment.</p>`;
}

export function appointmentRescheduleEmail(
  args: AppointmentRescheduleArgs,
): { subject: string; html: string; text: string } {
  const subject = `Your appointment has been rescheduled — ${args.typeName}`;

  const locationHtml =
    args.locationType === "online"
      ? onlineLocationHtml(args)
      : `<p style="margin:0 0 12px 0;"><strong>Location:</strong> ${escapeHtml(args.onsiteAddress ?? "Big Bang Immigration office")}</p>`;

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your <strong>${escapeHtml(args.typeName)}</strong> has been rescheduled.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;font-size:14px;">
  <tr>
    <td style="padding:8px 12px;color:#78716c;text-decoration:line-through;">${escapeHtml(args.previousDateDisplay)} at ${escapeHtml(args.previousTimeDisplay)}</td>
  </tr>
  <tr>
    <td style="padding:8px 12px;color:#0c0a09;font-weight:600;">${escapeHtml(args.newDateDisplay)} at ${escapeHtml(args.newTimeDisplay)} (${escapeHtml(args.timezoneDisplay)})</td>
  </tr>
</table>
<p style="margin:0 0 12px 0;color:#57534e;">Duration: ${args.durationMinutes} minutes</p>
${locationHtml}
${args.managementUrl ? buttonHtml("Manage appointment", args.managementUrl) : ""}
<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">An updated calendar invite is attached.</p>`;

  const html = emailLayout({
    previewText: `Rescheduled to ${args.newDateDisplay} at ${args.newTimeDisplay}`,
    bodyHtml,
  });

  const text = [
    `Hello ${args.clientName},`,
    "",
    `Your ${args.typeName} has been rescheduled.`,
    `Previous: ${args.previousDateDisplay} at ${args.previousTimeDisplay}`,
    `New: ${args.newDateDisplay} at ${args.newTimeDisplay} (${args.timezoneDisplay})`,
    `Duration: ${args.durationMinutes} minutes`,
    "",
    args.locationType === "online"
      ? args.teamsJoinUrl
        ? `Teams meeting (same link as before): ${args.teamsJoinUrl}`
        : `Online meeting: ${args.onlineLink ?? "A link will be sent shortly before your appointment."}`
      : `Location: ${args.onsiteAddress ?? "Big Bang Immigration office"}`,
    "",
    args.managementUrl
      ? `Manage appointment: ${args.managementUrl}`
      : "",
    "An updated calendar invite is attached.",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
