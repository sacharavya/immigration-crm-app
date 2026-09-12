import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentPaymentRejectedArgs = {
  clientName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  rejectionReason: string;
  bookAgainUrl: string;
};

export function appointmentPaymentRejectedEmail(
  args: AppointmentPaymentRejectedArgs,
): { subject: string; html: string; text: string } {
  const subject = "Payment proof could not be verified";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">We weren&apos;t able to verify the payment proof you submitted for your consultation on <strong>${escapeHtml(args.dateDisplay)}</strong> at ${escapeHtml(args.timeDisplay)}.</p>
<p style="margin:0 0 16px 0;color:#0c0a09;"><strong>Reason:</strong> ${escapeHtml(args.rejectionReason)}</p>
<p style="margin:0 0 12px 0;">We&apos;ve cancelled this booking and released the slot. To book again, use the button below. If you believe this was a mistake or need help, email us at info@genzdatalabs.com.</p>
${buttonHtml("Book a new consultation", args.bookAgainUrl)}`;

  const html = emailLayout({
    previewText: "Your payment proof could not be verified",
    bodyHtml,
  });

  const text = [
    `Hello ${args.clientName},`,
    "",
    `We weren't able to verify the payment proof you submitted for your consultation on ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}).`,
    `Reason: ${args.rejectionReason}.`,
    "",
    `We've cancelled this booking and released the slot. To book again, visit ${args.bookAgainUrl}. Email us at info@genzdatalabs.com if you need help.`,
  ].join("\n");

  return { subject, html, text };
}
