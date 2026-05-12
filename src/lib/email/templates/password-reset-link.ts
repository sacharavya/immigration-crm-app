import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  firstName: string;
  resetUrl: string;
  expiresInHours?: number;
};

export function passwordResetLinkEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const hours = args.expiresInHours ?? 24;
  const subject = `Reset your Big Bang Immigration CRM password`;

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.firstName)},</p>
<p style="margin:0 0 12px 0;">An administrator initiated a password reset for your CRM account. Click the button below to choose a new password — no temporary password to remember.</p>
${buttonHtml("Reset password", args.resetUrl)}
<p style="margin:18px 0 0 0;color:#57534e;font-size:13px;">This link can be used once and expires in ${hours} hours. If the button doesn't work, copy this link into your browser:</p>
<p style="margin:6px 0 0 0;color:#57534e;font-size:12px;word-break:break-all;"><a href="${escapeHtml(args.resetUrl)}" style="color:#1d4ed8;">${escapeHtml(args.resetUrl)}</a></p>
<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">If you didn't expect this, contact your administrator immediately — your account may need to be locked.</p>`;

  const text = `Hi ${args.firstName},

An administrator initiated a password reset for your CRM account.

Reset your password by visiting this link (valid for ${hours} hours, one-time use):

${args.resetUrl}

If you didn't expect this, contact your administrator immediately.

Big Bang Immigration Consulting Inc.`;

  return {
    subject,
    html: emailLayout({
      previewText: "Click to set a new password for your CRM account.",
      bodyHtml,
    }),
    text,
  };
}
