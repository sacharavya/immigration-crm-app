import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  signingUrl: string;
  expiryDate: Date;
  isResend?: boolean;
};

export function retainerInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const expiry = args.expiryDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subject = args.isResend
    ? `Reminder: your retainer agreement is ready to sign — genzdatalabs Immigration`
    : `Your retainer agreement is ready to sign — genzdatalabs Immigration`;

  const greeting = args.isResend
    ? `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">A quick reminder that your retainer agreement for case <strong>${escapeHtml(args.caseNumber)}</strong> is still waiting for your signature.</p>`
    : `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your retainer agreement for case <strong>${escapeHtml(args.caseNumber)}</strong> is ready to review and sign. Click the button below to view and sign the agreement.</p>`;

  const bodyHtml = `${greeting}
${buttonHtml("Sign retainer agreement", args.signingUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">This link expires on <strong>${escapeHtml(expiry)}</strong>.</p>
<p style="margin:24px 0 0 0;">If you have any questions, email us at info@genzdatalabs.com or contact Shasi at +1 416-386-5351.</p>`;

  const text = `Hello ${args.clientName},

${args.isResend ? "A quick reminder that your" : "Your"} retainer agreement for case ${args.caseNumber} is ready to review and sign.

Sign here: ${args.signingUrl}

This link expires on ${expiry}.

If you have any questions, email us at info@genzdatalabs.com or contact Shasi at +1 416-386-5351.

genzdatalabs Immigration Consulting Inc.
211-2390 Eglinton Avenue East
Toronto, ON M1K 2P5`;

  return {
    subject,
    html: emailLayout({
      previewText: args.isResend
        ? "Reminder: your retainer is waiting for your signature."
        : "Your retainer is ready to review and sign.",
      bodyHtml,
    }),
    text,
  };
}
