import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  uploadUrl: string;
  // Optional personal note from staff that prefixes the body. If
  // present, rendered before the standard "documents are ready"
  // language so the recipient sees the personal message first.
  customMessage?: string;
};

export function clientUploadInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Documents needed for your case ${args.caseNumber} — Big Bang Immigration`;

  const customBlockHtml = args.customMessage?.trim()
    ? `<p style="margin:0 0 14px 0;padding:12px 14px;border-left:3px solid #d6d3d1;background:#fafaf9;color:#1c1917;white-space:pre-wrap;">${escapeHtml(
        args.customMessage.trim(),
      )}</p>`
    : "";

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
${customBlockHtml}<p style="margin:0 0 12px 0;">We&rsquo;ve set up a private upload page for your case <strong>${escapeHtml(
    args.caseNumber,
  )}</strong>. Click the button below to see exactly which documents we need and upload them directly &mdash; no email attachments needed.</p>
${buttonHtml("Open document upload page", args.uploadUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">If a document is rejected (for example, a blurry photo), you&rsquo;ll see a note on the page explaining what to fix. Just upload a new version and we&rsquo;ll review it again.</p>
<p style="margin:24px 0 0 0;">If you have any questions, email us at info@bigbangimmigration.com or contact our office at +1 416-386-5351.</p>`;

  const customBlockText = args.customMessage?.trim()
    ? `${args.customMessage.trim()}\n\n`
    : "";

  const text = `Hello ${args.clientName},

${customBlockText}We've set up a private upload page for your case ${args.caseNumber}. Open the link below to see exactly which documents we need and upload them directly:

${args.uploadUrl}

If a document is rejected, you'll see a note on the page explaining what to fix. Just upload a new version.

If you have any questions, email us at info@bigbangimmigration.com or contact our office at +1 416-386-5351.

Big Bang Immigration Consulting Inc.
211-2390 Eglinton Avenue East
Toronto, ON M1K 2P5`;

  return {
    subject,
    html: emailLayout({
      previewText:
        "Your private document upload page is ready. Open the link to see what we need.",
      bodyHtml,
    }),
    text,
  };
}
