import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

export type AppointmentAbandonedArgs = {
  clientName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  bookAgainUrl: string;
};

export function appointmentAbandonedEmail(
  args: AppointmentAbandonedArgs,
): { subject: string; html: string; text: string } {
  const subject = "Your consultation booking was released";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">We didn&apos;t receive payment proof for your consultation on <strong>${escapeHtml(args.dateDisplay)}</strong> at ${escapeHtml(args.timeDisplay)}, so the slot has been released.</p>
<p style="margin:0 0 12px 0;">If you&apos;d still like to book a consultation, use the button below. Email us at info@genzdatalabs.com if you need help.</p>
${buttonHtml("Book a new consultation", args.bookAgainUrl)}`;

  const html = emailLayout({
    previewText: "Your consultation slot was released",
    bodyHtml,
  });

  const text = [
    `Hello ${args.clientName},`,
    "",
    `We didn't receive payment proof for your consultation on ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}), so the slot has been released.`,
    "",
    `If you'd still like to book a consultation, visit ${args.bookAgainUrl}. Email us at info@genzdatalabs.com if you need help.`,
  ].join("\n");

  return { subject, html, text };
}
