import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentInternalNotificationArgs = {
  recipientFirstName: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  durationMinutes: number;
  locationType: "online" | "onsite";
  reason: string;
  bookingSource: string; // staff | public_portal | manual_import
  dashboardUrl: string;
};

export function appointmentInternalNotificationEmail(
  args: AppointmentInternalNotificationArgs,
): { subject: string; html: string; text: string } {
  const sourceLabel =
    args.bookingSource === "public_portal"
      ? "via public booking page"
      : args.bookingSource === "manual_import"
        ? "via manual import"
        : "by staff";
  const subject = `New booking: ${args.clientName} (${args.dateDisplay} ${args.timeDisplay})`;

  const bodyHtml = `
<p style="margin:0 0 12px 0;">${args.recipientFirstName ? `Hi ${escapeHtml(args.recipientFirstName)},` : "Hi there,"}</p>
<p style="margin:0 0 12px 0;">A new <strong>${escapeHtml(args.typeName)}</strong> was just booked ${escapeHtml(sourceLabel)}.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;font-size:14px;border-collapse:collapse;">
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">When</td><td style="padding:4px 0;"><strong>${escapeHtml(args.dateDisplay)} at ${escapeHtml(args.timeDisplay)}</strong> (${escapeHtml(args.timezoneDisplay)})</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">Duration</td><td style="padding:4px 0;">${args.durationMinutes} minutes</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">Location</td><td style="padding:4px 0;">${args.locationType === "online" ? "Online" : "Onsite"}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">Client</td><td style="padding:4px 0;">${escapeHtml(args.clientName)} &lt;${escapeHtml(args.clientEmail)}&gt;${args.clientPhone ? ` · ${escapeHtml(args.clientPhone)}` : ""}</td></tr>
</table>
<p style="margin:0 0 12px 0;color:#0c0a09;"><strong>Reason</strong></p>
<p style="margin:0 0 12px 0;white-space:pre-wrap;color:#1c1917;font-size:14px;">${escapeHtml(args.reason)}</p>
${buttonHtml("Open in CRM", args.dashboardUrl)}`;

  const html = emailLayout({
    previewText: `${args.typeName} with ${args.clientName} · ${args.dateDisplay} ${args.timeDisplay}`,
    bodyHtml,
  });

  const text = [
    args.recipientFirstName ? `Hi ${args.recipientFirstName},` : "Hi there,",
    "",
    `New ${args.typeName} booked ${sourceLabel}.`,
    "",
    `When: ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay})`,
    `Duration: ${args.durationMinutes} minutes`,
    `Location: ${args.locationType === "online" ? "Online" : "Onsite"}`,
    `Client: ${args.clientName} <${args.clientEmail}>${args.clientPhone ? ` · ${args.clientPhone}` : ""}`,
    "",
    "Reason:",
    args.reason,
    "",
    `Open in CRM: ${args.dashboardUrl}`,
  ].join("\n");

  return { subject, html, text };
}
