import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  intakeUrl: string;
  // Optional personal note from staff that prefixes the body. Rendered
  // verbatim (escaped) before the standard language, so staff can warm
  // the cold-email feel without us templating their voice.
  customMessage?: string;
};

export function intakeInviteEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Please complete your intake form — Big Bang Immigration`;

  const customBlockHtml = args.customMessage?.trim()
    ? `<p style="margin:0 0 14px 0;padding:12px 14px;border-left:3px solid #d6d3d1;background:#fafaf9;color:#1c1917;white-space:pre-wrap;">${escapeHtml(
        args.customMessage.trim(),
      )}</p>`
    : "";

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
${customBlockHtml}<p style="margin:0 0 12px 0;">To start working on your file we need some background information. Please open the secure link below and complete the intake form &mdash; you can save as you go and return to the same link any time before submitting.</p>
${buttonHtml("Open intake form", args.intakeUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">The link is private to you. Anything you enter is saved automatically. When you&rsquo;re finished, click <strong>Submit</strong> at the bottom of the form &mdash; we&rsquo;ll review it and follow up if anything needs clarification.</p>
<p style="margin:24px 0 0 0;">If you have any questions, reply to this email or contact our office at +1 416-386-5351.</p>`;

  const customBlockText = args.customMessage?.trim()
    ? `${args.customMessage.trim()}\n\n`
    : "";

  const text = `Hello ${args.clientName},

${customBlockText}To start working on your file we need some background information. Please open the secure link below and complete the intake form. You can save as you go and return to the same link any time before submitting.

${args.intakeUrl}

The link is private to you. Anything you enter is saved automatically. When you're finished, click Submit at the bottom of the form.

If you have any questions, reply to this email or contact our office at +1 416-386-5351.

Big Bang Immigration Consulting Inc.
211-2390 Eglinton Avenue East
Toronto, ON M1K 2P5`;

  return {
    subject,
    html: emailLayout({
      previewText:
        "Your private intake form is ready. Open the link to fill it out at your pace.",
      bodyHtml,
    }),
    text,
  };
}
