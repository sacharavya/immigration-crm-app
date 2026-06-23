import { emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  serviceType: string;
  fromPhaseLabel: string;
  toPhaseLabel: string;
  staffNote?: string;
};

const PHASE_DESCRIPTIONS: Record<string, string> = {
  Documents:
    "We are now collecting the documents required for your application. You may receive a request to upload documents through our secure portal.",
  Review:
    "All required documents have been received and our team is now reviewing your application package before submission to IRCC.",
  Submitted:
    "Your application has been submitted to Immigration, Refugees and Citizenship Canada (IRCC). Processing times vary, and we will notify you of any updates or requests from IRCC.",
};

export function casePhaseAdvanceEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(args.clientName);
  const caseNum = escapeHtml(args.caseNumber);
  const service = escapeHtml(args.serviceType);
  const toPhase = escapeHtml(args.toPhaseLabel);

  const subject = `Case update: ${args.toPhaseLabel} phase - Case ${args.caseNumber}`;

  const phaseDesc =
    PHASE_DESCRIPTIONS[args.toPhaseLabel] ??
    `Your case has moved to the ${toPhase} phase.`;

  const noteBlock = args.staffNote
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #94a3b8;font-size:14px;line-height:1.6;color:#475569;"><strong>Note from your consultant:</strong><br/>${escapeHtml(args.staffNote)}</p>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:14px;color:#374151;">
      Dear ${name},
    </p>
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937;">
      Your case has progressed to: ${toPhase}
    </h1>
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">
      ${service} &middot; Case ${caseNum}
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      ${escapeHtml(phaseDesc)}
    </p>
    ${noteBlock}
    <p style="margin:16px 0;font-size:14px;color:#6b7280;">
      No action is required from you at this time unless your consultant
      contacts you separately. If you have any questions, please do not
      hesitate to reach out.
    </p>
  `;

  const textParts = [
    `Dear ${args.clientName},`,
    "",
    `Your case has progressed to: ${args.toPhaseLabel}`,
    `${args.serviceType} - Case ${args.caseNumber}`,
    "",
    phaseDesc,
  ];
  if (args.staffNote) {
    textParts.push("", `Note from your consultant: ${args.staffNote}`);
  }
  textParts.push(
    "",
    "No action is required from you unless your consultant contacts you separately.",
  );

  return {
    subject,
    html: emailLayout({ previewText: subject, bodyHtml }),
    text: textParts.join("\n"),
  };
}
