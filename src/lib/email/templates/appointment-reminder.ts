import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentReminderArgs = {
  clientName: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  durationMinutes: number;
  locationType: "online" | "onsite";
  onlineLink: string | null;
  onsiteAddress: string | null;
  // APPT-7: Teams join URL — when set, the reminder leads with the Join
  // button so the client can one-click into the meeting tomorrow.
  teamsJoinUrl: string | null;
  managementUrl: string | null;
};

function onlineLocationHtml(args: AppointmentReminderArgs): string {
  if (args.teamsJoinUrl) {
    return `<p style="margin:0 0 8px 0;"><strong>Microsoft Teams meeting:</strong></p>
${buttonHtml("Join Teams meeting", args.teamsJoinUrl)}`;
  }
  if (args.onlineLink) {
    return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> <a href="${escapeHtml(args.onlineLink)}">${escapeHtml(args.onlineLink)}</a></p>`;
  }
  return `<p style="margin:0 0 12px 0;"><strong>Online meeting:</strong> The link will be sent shortly before your appointment.</p>`;
}

export function appointmentReminderEmail(
  args: AppointmentReminderArgs,
): { subject: string; html: string; text: string } {
  const subject = `Reminder: your appointment tomorrow — ${args.typeName}`;

  const locationHtml =
    args.locationType === "online"
      ? onlineLocationHtml(args)
      : `<p style="margin:0 0 12px 0;"><strong>Location:</strong> ${escapeHtml(args.onsiteAddress ?? "genzdatalabs Immigration office")}</p>`;

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">A friendly reminder about your <strong>${escapeHtml(args.typeName)}</strong> tomorrow.</p>
<p style="margin:0 0 12px 0;"><strong>${escapeHtml(args.dateDisplay)}</strong> at <strong>${escapeHtml(args.timeDisplay)}</strong> (${escapeHtml(args.timezoneDisplay)}) · ${args.durationMinutes} min</p>
${locationHtml}
${args.managementUrl && !args.teamsJoinUrl ? buttonHtml("Manage appointment", args.managementUrl) : ""}`;

  const html = emailLayout({
    previewText: `Reminder: ${args.typeName} tomorrow at ${args.timeDisplay}`,
    bodyHtml,
  });

  const onlineText = args.teamsJoinUrl
    ? `Teams meeting: ${args.teamsJoinUrl}`
    : `Online meeting: ${args.onlineLink ?? "Link will be sent shortly before your appointment."}`;

  const text = [
    `Hello ${args.clientName},`,
    "",
    `Reminder about your ${args.typeName} tomorrow:`,
    `${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}) · ${args.durationMinutes} min`,
    "",
    args.locationType === "online"
      ? onlineText
      : `Location: ${args.onsiteAddress ?? "genzdatalabs Immigration office"}`,
    "",
    args.managementUrl ? `Manage appointment: ${args.managementUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
