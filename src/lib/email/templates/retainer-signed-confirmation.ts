import { emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  hasAttachment: boolean;
};

export function retainerSignedConfirmationEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your retainer is signed — Big Bang Immigration`;

  const attachmentLine = args.hasAttachment
    ? `<p style="margin:0 0 12px 0;">A copy of your signed agreement is attached to this email for your records.</p>`
    : `<p style="margin:0 0 12px 0;">Your signed agreement is on file with our office. Email us at info@bigbangimmigration.com if you'd like a copy sent to you.</p>`;

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
<p style="margin:0 0 12px 0;">Your retainer agreement for case <strong>${escapeHtml(args.caseNumber)}</strong> is now fully signed and in effect.</p>
${attachmentLine}
<p style="margin:24px 0 0 0;"><strong>Next step:</strong> a member of our team will be in touch shortly to begin gathering your documents.</p>
<p style="margin:24px 0 0 0;">If you have any questions, email us at info@bigbangimmigration.com.</p>`;

  const text = `Hello ${args.clientName},

Your retainer agreement for case ${args.caseNumber} is now fully signed and in effect.
${args.hasAttachment ? "A copy is attached for your records." : "Your signed agreement is on file with our office."}

Next step: a member of our team will be in touch shortly to begin gathering your documents.

If you have any questions, email us at info@bigbangimmigration.com.

Big Bang Immigration Consulting Inc.`;

  return {
    subject,
    html: emailLayout({
      previewText: "Your retainer is signed and in effect.",
      bodyHtml,
    }),
    text,
  };
}
