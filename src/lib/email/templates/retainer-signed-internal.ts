import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  caseUrl: string;
  method: "online_signature" | "signature_image_overlay" | "scanned_upload";
};

const METHOD_LABEL: Record<Args["method"], string> = {
  online_signature: "online (signature pad)",
  signature_image_overlay: "online (uploaded signature image)",
  scanned_upload: "scanned upload",
};

export function retainerSignedInternalEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Retainer signed: ${args.clientName} (${args.caseNumber})`;
  const methodLabel = METHOD_LABEL[args.method];

  const bodyHtml = `<p style="margin:0 0 12px 0;"><strong>${escapeHtml(args.clientName)}</strong> has signed the retainer for case <strong>${escapeHtml(args.caseNumber)}</strong>.</p>
<p style="margin:0 0 12px 0;color:#57534e;">Method: ${escapeHtml(methodLabel)}</p>
${buttonHtml("Open case", args.caseUrl)}
<p style="margin:0 0 12px 0;color:#57534e;font-size:14px;">The phase gate is now satisfied as soon as the retainer minimum payment lands.</p>`;

  const text = `${args.clientName} has signed the retainer for case ${args.caseNumber}.
Method: ${methodLabel}

Open case: ${args.caseUrl}

The phase gate is now satisfied as soon as the retainer minimum payment lands.`;

  return {
    subject,
    html: emailLayout({
      previewText: `${args.clientName} has signed the retainer for ${args.caseNumber}.`,
      bodyHtml,
    }),
    text,
  };
}
