import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentPaymentStaffNotificationArgs = {
  recipientFirstName: string | null;
  clientName: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  feeCad: number;
  referenceCode: string;
  reviewUrl: string;
};

function formatFee(cad: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cad);
}

export function appointmentPaymentStaffNotificationEmail(
  args: AppointmentPaymentStaffNotificationArgs,
): { subject: string; html: string; text: string } {
  const subject = `Payment proof to review: ${args.clientName} for ${args.dateDisplay}`;

  const bodyHtml = `
<p style="margin:0 0 12px 0;">${args.recipientFirstName ? `Hi ${escapeHtml(args.recipientFirstName)},` : "Hi there,"}</p>
<p style="margin:0 0 12px 0;"><strong>${escapeHtml(args.clientName)}</strong> uploaded payment proof for their <strong>${escapeHtml(args.typeName)}</strong> consultation on <strong>${escapeHtml(args.dateDisplay)}</strong> at ${escapeHtml(args.timeDisplay)} (${escapeHtml(args.timezoneDisplay)}).</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;font-size:14px;border-collapse:collapse;">
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">Fee</td><td style="padding:4px 0;"><strong>${formatFee(args.feeCad)}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#78716c;">Reference</td><td style="padding:4px 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">${escapeHtml(args.referenceCode)}</td></tr>
</table>
${buttonHtml("Review payment", args.reviewUrl)}`;

  const html = emailLayout({
    previewText: `${args.clientName} uploaded payment proof for ${args.dateDisplay}`,
    bodyHtml,
  });

  const text = [
    args.recipientFirstName ? `Hi ${args.recipientFirstName},` : "Hi there,",
    "",
    `${args.clientName} uploaded payment proof for their ${args.typeName} consultation on ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}).`,
    "",
    `Fee: ${formatFee(args.feeCad)}`,
    `Reference: ${args.referenceCode}`,
    "",
    `Review payment: ${args.reviewUrl}`,
  ].join("\n");

  return { subject, html, text };
}
