import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  signingUrl: string;
  expiryDate: Date;
};

export function consultationAgreementInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const expiry = args.expiryDate.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const subject =
    "Please sign your Initial Consultation Agreement — Big Bang Immigration";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Before your consultation, please review and sign our Initial Consultation Agreement. Click the button below to read and sign it online.</p>
${buttonHtml("Review & sign agreement", args.signingUrl)}
<p style="margin:16px 0 0 0; font-size:13px; color:#57534e;">This link expires on ${escapeHtml(expiry)}. If it expires before you sign, contact us and we'll send a new one.</p>`;

  const text = `Hello ${args.clientName},

Before your consultation, please review and sign our Initial Consultation Agreement:
${args.signingUrl}

This link expires on ${expiry}.

Big Bang Immigration`;

  return {
    subject,
    html: emailLayout({
      previewText: "Sign your consultation agreement to confirm your booking.",
      bodyHtml,
    }),
    text,
  };
}
