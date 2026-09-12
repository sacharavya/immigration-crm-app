import { emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
};

// Confirmation after the client signs. The signed PDF is attached by the caller.
export function consultationAgreementSignedEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your signed consultation agreement — genzdatalabs Immigration";

  const bodyHtml = `
<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Thank you — we've received your signed Initial Consultation Agreement. A copy is attached to this email for your records.</p>
<p style="margin:0 0 12px 0;">We look forward to your consultation.</p>`;

  const text = `Hello ${args.clientName},

Thank you — we've received your signed Initial Consultation Agreement. A copy is attached for your records.

We look forward to your consultation.

genzdatalabs Immigration`;

  return {
    subject,
    html: emailLayout({
      previewText: "A copy of your signed consultation agreement is attached.",
      bodyHtml,
    }),
    text,
  };
}
