import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  firstName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
};

export function staffInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to genzdatalabs Immigration`;

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.firstName)},</p>
<p style="margin:0 0 12px 0;">Your account on the genzdatalabs Immigration CRM is ready. Sign in with the credentials below — you'll be asked to set a new password on first login.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#1c1917;">
      <div style="margin-bottom:8px;"><span style="color:#78716c;">Email:</span> <strong>${escapeHtml(args.email)}</strong></div>
      <div><span style="color:#78716c;">Temporary password:</span> <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(args.tempPassword)}</code></div>
    </td>
  </tr>
</table>
${buttonHtml("Sign in", args.loginUrl)}
<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">If you weren't expecting this email, please contact your administrator.</p>`;

  const text = `Hi ${args.firstName},

Your account on the genzdatalabs Immigration CRM is ready.

Sign in at: ${args.loginUrl}
Email: ${args.email}
Temporary password: ${args.tempPassword}

You'll be asked to set a new password on first login.

If you weren't expecting this email, please contact your administrator.

genzdatalabs Immigration Consulting Inc.`;

  return {
    subject,
    html: emailLayout({
      previewText: "Your genzdatalabs Immigration CRM account is ready.",
      bodyHtml,
    }),
    text,
  };
}
