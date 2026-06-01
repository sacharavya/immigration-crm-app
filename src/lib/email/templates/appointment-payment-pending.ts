import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentPaymentPendingArgs = {
  clientName: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  durationMinutes: number;
  feeCad: number;
  feeRecipientEmail: string;
  referenceCode: string;
  managementUrl: string;
};

function formatFee(cad: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cad);
}

export function appointmentPaymentPendingEmail(
  args: AppointmentPaymentPendingArgs,
): { subject: string; html: string; text: string } {
  const subject = "Action needed: secure your consultation slot";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your consultation slot for <strong>${escapeHtml(args.dateDisplay)}</strong> at <strong>${escapeHtml(args.timeDisplay)}</strong> is held but not yet confirmed.</p>
<p style="margin:0 0 12px 0;">To secure your spot, send an Interac e-transfer for <strong>${formatFee(args.feeCad)}</strong> to <a href="mailto:${escapeHtml(args.feeRecipientEmail)}">${escapeHtml(args.feeRecipientEmail)}</a> and upload your screenshot of the payment or payment receipt at the link below. Our staff will verify the payment and secure your appointment before the end of the day.</p>
<p style="margin:0 0 12px 0;">Please include this reference in the e-transfer message field:</p>
<p style="margin:0 0 16px 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:16px;background:#fafaf9;padding:8px 12px;border:1px solid #e7e5e4;border-radius:6px;display:inline-block;">${escapeHtml(args.referenceCode)}</p>
${buttonHtml("Upload payment proof", args.managementUrl)}
<hr style="border:0;border-top:1px solid #e7e5e4;margin:24px 0;" />
<p style="margin:0 0 12px 0;color:#57534e;font-size:13px;">The payment you make for the consultation can be applied as a deposit toward your retainer if you decide to proceed with us. If you choose not to retain our services, the payment will be kept as a consultation fee.</p>
<p style="margin:0 0 12px 0;color:#b45309;font-size:13px;">If we don&apos;t receive your payment proof by the end of the day, the slot will be released and your appointment cancelled.</p>`;

  const html = emailLayout({
    previewText: `Send ${formatFee(args.feeCad)} via Interac to secure your slot`,
    bodyHtml,
  });

  const text = [
    `Hello ${args.clientName},`,
    "",
    `Your consultation slot for ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}) is held but not yet confirmed.`,
    "",
    `To secure your spot, send an Interac e-transfer for ${formatFee(args.feeCad)} to ${args.feeRecipientEmail} and upload your screenshot at the link below. Our staff will verify the payment and secure your appointment before the end of the day.`,
    "",
    `Please include this reference in the e-transfer message field: ${args.referenceCode}`,
    "",
    `Upload payment proof: ${args.managementUrl}`,
    "",
    "The payment you make for the consultation can be applied as a deposit toward your retainer if you decide to proceed with us. If you choose not to retain our services, the payment will be kept as a consultation fee.",
    "",
    "If we don't receive your payment proof by the end of the day, the slot will be released and your appointment cancelled.",
  ].join("\n");

  return { subject, html, text };
}
