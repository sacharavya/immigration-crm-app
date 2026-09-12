import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentConfirmationArgs = {
  clientName: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  durationMinutes: number;
  locationType: "online" | "onsite";
  onlineLink: string | null;
  onsiteAddress: string | null;
  // APPT-7: when set, replaces onlineLink in the location block and is
  // labelled as a Teams meeting with friendly join copy.
  teamsJoinUrl: string | null;
  managementUrl: string | null;
};

// Returns the location block as HTML. APPT-7 prefers the Teams join URL
// when present and labels it as such; falls back to manual onlineLink;
// otherwise the "link will be sent" placeholder.
function onlineLocationHtml(args: AppointmentConfirmationArgs): string {
  if (args.teamsJoinUrl) {
    return `<p style="margin:0 0 8px 0;"><strong>Microsoft Teams meeting:</strong></p>
${buttonHtml("Join Teams meeting", args.teamsJoinUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:13px;">Join from any device — no Microsoft account required.</p>`;
  }
  if (args.onlineLink) {
    return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> <a href="${escapeHtml(args.onlineLink)}">${escapeHtml(args.onlineLink)}</a></p>`;
  }
  return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> A link will be sent to you shortly before your appointment.</p>`;
}

export function appointmentConfirmationEmail(
  args: AppointmentConfirmationArgs,
): { subject: string; html: string; text: string } {
  const subject = `Your appointment is confirmed — ${args.typeName}`;

  const locationHtml =
    args.locationType === "online"
      ? onlineLocationHtml(args)
      : `<p style="margin:0 0 12px 0;"><strong>Location:</strong> ${escapeHtml(args.onsiteAddress ?? "genzdatalabs Immigration office")}</p>`;

  const manageHtml = args.managementUrl
    ? `<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">Need to make changes? <a href="${escapeHtml(args.managementUrl)}">Reschedule or cancel</a>.</p>`
    : `<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">Need to make changes? Email us at info@genzdatalabs.com or call us.</p>`;

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your <strong>${escapeHtml(args.typeName)}</strong> is confirmed for <strong>${escapeHtml(args.dateDisplay)}</strong> at <strong>${escapeHtml(args.timeDisplay)}</strong> (${escapeHtml(args.timezoneDisplay)}).</p>
<p style="margin:0 0 12px 0;color:#57534e;">Duration: ${args.durationMinutes} minutes</p>
${locationHtml}
${args.managementUrl && !args.teamsJoinUrl ? buttonHtml("Manage appointment", args.managementUrl) : ""}
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">A calendar invite is attached so you can add this to your personal calendar.</p>
${manageHtml}`;

  const html = emailLayout({
    previewText: `${args.typeName} confirmed for ${args.dateDisplay} at ${args.timeDisplay}`,
    bodyHtml,
  });

  const onlineText = args.teamsJoinUrl
    ? `Teams meeting: ${args.teamsJoinUrl}`
    : `Online meeting: ${args.onlineLink ?? "A link will be sent shortly before your appointment."}`;

  const text = [
    `Hello ${args.clientName},`,
    "",
    `Your ${args.typeName} is confirmed for ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}).`,
    `Duration: ${args.durationMinutes} minutes`,
    "",
    args.locationType === "online"
      ? onlineText
      : `Location: ${args.onsiteAddress ?? "genzdatalabs Immigration office"}`,
    "",
    args.managementUrl
      ? `Manage appointment: ${args.managementUrl}`
      : `Need to make changes? Email us at info@genzdatalabs.com or call us.`,
    "",
    "A calendar invite is attached.",
  ].join("\n");

  return { subject, html, text };
}
