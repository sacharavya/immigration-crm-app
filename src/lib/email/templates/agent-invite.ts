import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
};

// Welcome email for a referral agent. Mirrors staffInviteEmail but speaks to a
// partner who lands in the agent portal rather than the staff dashboard.
export function agentInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Big Bang Immigration partner account`;

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hi ${escapeHtml(args.name)},</p>
<p style="margin:0 0 12px 0;">A referral partner account has been created for you on the Big Bang Immigration CRM. Sign in with the credentials below — you'll be asked to set a new password on first login. You'll be able to register your clients and track the ones you've referred.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;">
  <tr>
    <td style="padding:16px 20px;font-size:14px;color:#1c1917;">
      <div style="margin-bottom:8px;"><span style="color:#78716c;">Email:</span> <strong>${escapeHtml(args.email)}</strong></div>
      <div><span style="color:#78716c;">Temporary password:</span> <code style="background:#f5f5f4;padding:2px 6px;border-radius:4px;font-size:13px;">${escapeHtml(args.tempPassword)}</code></div>
    </td>
  </tr>
</table>
${buttonHtml("Sign in", args.loginUrl)}
<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">If you weren't expecting this email, please contact your Big Bang Immigration representative.</p>`;

  const text = `Hi ${args.name},

A referral partner account has been created for you on the Big Bang Immigration CRM.

Sign in at: ${args.loginUrl}
Email: ${args.email}
Temporary password: ${args.tempPassword}

You'll be asked to set a new password on first login.

If you weren't expecting this email, please contact your Big Bang Immigration representative.

Big Bang Immigration Consulting Inc.`;

  return {
    subject,
    html: emailLayout({
      previewText: "Your Big Bang Immigration partner account is ready.",
      bodyHtml,
    }),
    text,
  };
}
