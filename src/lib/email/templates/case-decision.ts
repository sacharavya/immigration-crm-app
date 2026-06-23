import { buttonHtml, emailLayout, escapeHtml } from "./_layout";

type Args = {
  clientName: string;
  caseNumber: string;
  serviceType: string;
  outcome: "approved" | "refused";
  staffNote?: string;
  hasAttachment: boolean;
  consultationUrl: string;
};

export function caseDecisionEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(args.clientName);
  const caseNum = escapeHtml(args.caseNumber);
  const service = escapeHtml(args.serviceType);

  if (args.outcome === "approved") {
    return approvedEmail(name, caseNum, service, args);
  }
  return refusedEmail(name, caseNum, service, args);
}

function approvedEmail(
  name: string,
  caseNum: string,
  service: string,
  args: Args,
) {
  const subject = `Congratulations! Your ${args.serviceType} application has been approved`;

  const noteBlock = args.staffNote
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-left:4px solid #22c55e;font-size:14px;line-height:1.6;color:#15803d;">${escapeHtml(args.staffNote)}</p>`
    : "";

  const attachmentLine = args.hasAttachment
    ? `<p style="margin:12px 0;font-size:14px;color:#374151;">Please find the attached decision letter from IRCC for your records.</p>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#15803d;">
      Congratulations, ${name}!
    </h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;">
      We are pleased to inform you that your <strong>${service}</strong>
      application (Case ${caseNum}) has been <strong>approved</strong> by
      Immigration, Refugees and Citizenship Canada (IRCC).
    </p>
    ${noteBlock}
    ${attachmentLine}
    <p style="margin:16px 0;font-size:14px;line-height:1.6;color:#374151;">
      <strong>What happens next:</strong>
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
      <li>If a passport request has been issued, please follow the instructions in the decision letter to submit your passport.</li>
      <li>Our team will guide you through any remaining steps.</li>
      <li>Keep this email and the attached letter for your records.</li>
    </ul>
    <p style="margin:16px 0;font-size:14px;line-height:1.6;color:#374151;">
      Thank you for trusting Big Bang Immigration Consulting with your
      immigration journey. We are thrilled to see this positive outcome
      for you and your family.
    </p>
    <p style="margin:16px 0;font-size:14px;color:#6b7280;">
      If you have any questions about next steps, please do not hesitate
      to reach out.
    </p>
  `;

  const text = [
    `Congratulations, ${args.clientName}!`,
    "",
    `Your ${args.serviceType} application (Case ${args.caseNumber}) has been approved by IRCC.`,
    "",
    args.staffNote ? `Note from your consultant: ${args.staffNote}` : "",
    args.hasAttachment
      ? "Please find the attached decision letter from IRCC."
      : "",
    "",
    "What happens next:",
    "- If a passport request has been issued, follow the instructions in the decision letter.",
    "- Our team will guide you through any remaining steps.",
    "- Keep this email and the attached letter for your records.",
    "",
    "Thank you for trusting Big Bang Immigration Consulting.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: emailLayout({ previewText: subject, bodyHtml }),
    text,
  };
}

function refusedEmail(
  name: string,
  caseNum: string,
  service: string,
  args: Args,
) {
  const subject = `Update on your ${args.serviceType} application - Case ${args.caseNumber}`;

  const noteBlock = args.staffNote
    ? `<p style="margin:16px 0;padding:12px 16px;background:#fefce8;border-left:4px solid #eab308;font-size:14px;line-height:1.6;color:#854d0e;">${escapeHtml(args.staffNote)}</p>`
    : "";

  const attachmentLine = args.hasAttachment
    ? `<p style="margin:12px 0;font-size:14px;color:#374151;">The decision letter from IRCC is attached to this email. Please review it carefully as it contains important details about the reasons for the decision.</p>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1f2937;">
      Important update on your application
    </h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      Dear ${name},
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      We are sorry to inform you that your <strong>${service}</strong>
      application (Case ${caseNum}) was <strong>not approved</strong> by
      Immigration, Refugees and Citizenship Canada (IRCC).
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      We understand this is not the news you were hoping for, and we want
      you to know that we are here to support you through the next steps.
    </p>
    ${noteBlock}
    ${attachmentLine}
    <p style="margin:16px 0;font-size:14px;line-height:1.6;color:#374151;">
      <strong>Options to consider:</strong>
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.8;color:#374151;">
      <li>Review the decision letter carefully for the specific reasons cited by IRCC.</li>
      <li>Depending on the grounds, you may be able to file an appeal or judicial review.</li>
      <li>Alternative immigration pathways may still be available for your situation.</li>
      <li>We recommend booking a consultation to discuss your options.</li>
    </ul>
    ${buttonHtml("Book a consultation", args.consultationUrl)}
    <p style="margin:16px 0;font-size:14px;color:#6b7280;">
      Please do not lose hope. Many applicants find success through
      alternative routes or on reapplication. We are committed to
      helping you explore every available option.
    </p>
  `;

  const text = [
    `Dear ${args.clientName},`,
    "",
    `We are sorry to inform you that your ${args.serviceType} application (Case ${args.caseNumber}) was not approved by IRCC.`,
    "",
    "We understand this is difficult news, and we are here to support you.",
    "",
    args.staffNote ? `Note from your consultant: ${args.staffNote}` : "",
    args.hasAttachment
      ? "The decision letter from IRCC is attached. Please review it carefully."
      : "",
    "",
    "Options to consider:",
    "- Review the decision letter for specific reasons cited by IRCC.",
    "- You may be able to file an appeal or judicial review.",
    "- Alternative immigration pathways may still be available.",
    "- We recommend booking a consultation to discuss your options.",
    "",
    `Book a consultation: ${args.consultationUrl}`,
    "",
    "Please do not lose hope. We are committed to helping you explore every option.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: emailLayout({ previewText: subject, bodyHtml }),
    text,
  };
}
