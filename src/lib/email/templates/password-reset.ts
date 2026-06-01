import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  firstName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
};

export function passwordResetEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Big Bang Immigration CRM password was reset`;

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.firstName)},</p>
<p style="margin:0 0 12px 0;">An administrator has reset your password. Sign in with the temporary password below — you&rsquo;ll be asked to choose a new password on first login.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;">
  <tr>
    <td style="padding:14px 18px;font-size:14px;color:#1c1917;">
      <div style="margin-bottom:8px;"><span style="color:#78716c;">Email:</span> <strong>${escapeHtml(args.email)}</strong></div>
      <div><span style="color:#78716c;">Temporary password:</span> <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(args.tempPassword)}</code></div>
    </td>
  </tr>
</table>
${buttonHtml("Sign in", args.loginUrl)}

<p style="margin:28px 0 0 0;color:#57534e;font-size:14px;">If you didn&rsquo;t expect this, contact your administrator immediately — your account may need to be locked.</p>`;

  const text = `Hi ${args.firstName},

An administrator has reset your password. Sign in with the temporary password below — you'll be asked to choose a new password on first login.

  Sign in at:    ${args.loginUrl}
  Email:         ${args.email}
  Temp password: ${args.tempPassword}

If you didn't expect this, contact your administrator immediately.

Big Bang Immigration Consulting Inc.`;

  return {
    subject,
    html: emailLayout({
      previewText: "Your CRM password has been reset — sign in with the temporary password.",
      bodyHtml,
    }),
    text,
  };
}
