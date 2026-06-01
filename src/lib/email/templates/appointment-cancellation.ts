import { emailLayout, escapeHtml } from "./_layout";

export type AppointmentCancellationArgs = {
  clientName: string;
  typeName: string;
  dateDisplay: string;
  timeDisplay: string;
  timezoneDisplay: string;
  rebookUrl: string | null;
};

export function appointmentCancellationEmail(
  args: AppointmentCancellationArgs,
): { subject: string; html: string; text: string } {
  const subject = `Your appointment has been cancelled — ${args.typeName}`;

  const rebookHtml = args.rebookUrl
    ? `<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">Need to book again? <a href="${escapeHtml(args.rebookUrl)}">Pick a new time</a>.</p>`
    : "";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your <strong>${escapeHtml(args.typeName)}</strong> on <strong>${escapeHtml(args.dateDisplay)}</strong> at <strong>${escapeHtml(args.timeDisplay)}</strong> (${escapeHtml(args.timezoneDisplay)}) has been cancelled.</p>
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">A cancellation notice is attached. Calendar clients that recognise iCalendar will remove the event automatically.</p>
${rebookHtml}`;

  const html = emailLayout({
    previewText: `${args.typeName} cancelled`,
    bodyHtml,
  });

  const text = [
    `Hello ${args.clientName},`,
    "",
    `Your ${args.typeName} on ${args.dateDisplay} at ${args.timeDisplay} (${args.timezoneDisplay}) has been cancelled.`,
    "",
    args.rebookUrl ? `Need to book again? ${args.rebookUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
