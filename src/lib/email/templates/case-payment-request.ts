import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  amountDueCad: number;
  quotedFeeCad: number;
  alreadyPaidCad: number;
  recipientPaymentEmail: string;
  // Short reference code the client puts in the e-transfer message
  // field so staff can match the proof to the case at a glance. The
  // staff action defaults this to the case number.
  referenceCode: string;
  payUrl: string;
  // Optional staff-authored note prepended to the body (intake-invite
  // pattern). Lets the sender warm a cold email without templating
  // their voice.
  customMessage?: string;
};

function formatCad(cad: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(cad);
}

export function casePaymentRequestEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Action needed: payment for case ${args.caseNumber}`;

  const customBlockHtml = args.customMessage?.trim()
    ? `<p style="margin:0 0 14px 0;padding:12px 14px;border-left:3px solid #d6d3d1;background:#fafaf9;color:#1c1917;white-space:pre-wrap;">${escapeHtml(
        args.customMessage.trim(),
      )}</p>`
    : "";

  const bodyHtml = `<p style="margin:0 0 12px 0;">Hello ${escapeHtml(args.clientName)},</p>
${customBlockHtml}<p style="margin:0 0 12px 0;">There&rsquo;s an outstanding payment on your case <strong>${escapeHtml(
    args.caseNumber,
  )}</strong>. Here&rsquo;s where things stand:</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;width:100%;max-width:420px;">
  <tr>
    <td style="padding:12px 16px;font-size:14px;color:#1c1917;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:#78716c;">Quoted fee</span>
        <strong>${escapeHtml(formatCad(args.quotedFeeCad))}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="color:#78716c;">Already paid</span>
        <strong>${escapeHtml(formatCad(args.alreadyPaidCad))}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #e7e5e4;padding-top:6px;margin-top:6px;color:#b45309;">
        <span><strong>Amount due now</strong></span>
        <strong>${escapeHtml(formatCad(args.amountDueCad))}</strong>
      </div>
    </td>
  </tr>
</table>

<h3 style="margin:24px 0 8px 0;font-size:15px;color:#0f172a;">How to pay</h3>
<ol style="margin:0 0 12px 18px;padding:0;color:#1c1917;font-size:14px;line-height:1.6;">
  <li>Send an Interac e-transfer for <strong>${escapeHtml(formatCad(args.amountDueCad))}</strong> to <a href="mailto:${escapeHtml(args.recipientPaymentEmail)}">${escapeHtml(args.recipientPaymentEmail)}</a>.</li>
  <li>Put this reference in the e-transfer message field so we can match it to your file:
    <div style="margin:6px 0 0 0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:14px;background:#fafaf9;padding:6px 10px;border:1px solid #e7e5e4;border-radius:6px;display:inline-block;">${escapeHtml(args.referenceCode)}</div>
  </li>
  <li>After sending the e-transfer, open the secure link below and upload a screenshot of the confirmation.</li>
</ol>

${buttonHtml("Upload payment proof", args.payUrl)}

<p style="margin:24px 0 0 0;color:#57534e;font-size:14px;">Our team will verify the payment as soon as the proof comes in. Reply to this email if you have any questions.</p>`;

  const customBlockText = args.customMessage?.trim()
    ? `${args.customMessage.trim()}\n\n`
    : "";

  const text = `Hello ${args.clientName},

${customBlockText}There's an outstanding payment on your case ${args.caseNumber}.

  Quoted fee:    ${formatCad(args.quotedFeeCad)}
  Already paid:  ${formatCad(args.alreadyPaidCad)}
  Amount due:    ${formatCad(args.amountDueCad)}

How to pay:
  1. Send an Interac e-transfer for ${formatCad(args.amountDueCad)} to ${args.recipientPaymentEmail}.
  2. Include this reference in the message field: ${args.referenceCode}
  3. Upload a screenshot of the confirmation at: ${args.payUrl}

Our team will verify the payment as soon as the proof comes in. Reply to this email if you have any questions.

Big Bang Immigration Consulting Inc.
211-2390 Eglinton Avenue East
Toronto, ON M1K 2P5`;

  return {
    subject,
    html: emailLayout({
      previewText: `Send ${formatCad(args.amountDueCad)} via Interac and upload proof to secure your file.`,
      bodyHtml,
    }),
    text,
  };
}
