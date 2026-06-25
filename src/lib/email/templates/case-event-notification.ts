import { emailLayout, escapeHtml } from "./_layout";

type EventType =
  | "biometrics_requested"
  | "biometrics_scheduled"
  | "biometrics_completed"
  | "additional_info_requested"
  | "additional_info_submitted"
  | "interview_scheduled"
  | "interview_completed"
  | "application_returned"
  | "additional_documents_requested"
  | "passport_requested"
  | "appeal_filed"
  | "withdrawal_requested";

type Args = {
  clientName: string;
  caseNumber: string;
  eventType: EventType;
  staffNote?: string;
  hasAttachment: boolean;
  // Event-specific fields (optional, used when available)
  scheduledDate?: string;
  location?: string;
  whatWasAsked?: string;
  documentList?: string[];
  dueDate?: string;
};

const EVENT_COPY: Record<
  EventType,
  {
    title: string;
    heading: string;
    body: string;
    actionRequired?: string;
  }
> = {
  biometrics_requested: {
    title: "Biometrics requested",
    heading: "Biometrics have been requested for your case",
    body: "Immigration, Refugees and Citizenship Canada (IRCC) has requested biometrics (fingerprints and photograph) for your application. You will need to book an appointment at a designated biometrics collection point.",
    actionRequired:
      "Please book your biometrics appointment as soon as possible. Your consultant will provide guidance on the nearest collection location and any deadlines.",
  },
  biometrics_scheduled: {
    title: "Biometrics appointment scheduled",
    heading: "Your biometrics appointment has been scheduled",
    body: "Your biometrics appointment (fingerprints and photograph) has been scheduled.",
    actionRequired:
      "Please arrive on time with your passport and the biometrics instruction letter. Ensure your fingers are free of cuts or damage.",
  },
  biometrics_completed: {
    title: "Biometrics completed",
    heading: "Your biometrics have been submitted",
    body: "Your biometrics (fingerprints and photograph) have been successfully collected and submitted to IRCC. No further action is needed from you on this step.",
  },
  additional_info_requested: {
    title: "Additional information requested by IRCC",
    heading: "IRCC has requested additional information",
    body: "Immigration, Refugees and Citizenship Canada has requested additional information for your application. Our team is reviewing the request and will guide you on next steps.",
    actionRequired:
      "Please respond to any requests from your consultant promptly to avoid delays in processing.",
  },
  additional_info_submitted: {
    title: "Additional information submitted",
    heading: "Additional information has been submitted to IRCC",
    body: "The additional information requested by IRCC has been submitted on your behalf. We will notify you when we receive an update from IRCC.",
  },
  interview_scheduled: {
    title: "Interview scheduled by IRCC",
    heading: "IRCC has scheduled an interview for your case",
    body: "Immigration, Refugees and Citizenship Canada has scheduled an interview as part of your application process. Your consultant will help you prepare.",
    actionRequired:
      "Please confirm the date and time work for you and begin preparing with your consultant. Bring all requested documents and your passport.",
  },
  interview_completed: {
    title: "Interview completed",
    heading: "Your IRCC interview has been completed",
    body: "Your interview with IRCC has been completed. We will notify you when a decision is communicated.",
  },
  application_returned: {
    title: "Application returned by IRCC",
    heading: "Your application has been returned by IRCC",
    body: "IRCC has returned your application. This may be due to incomplete documentation or a procedural issue. Our team is reviewing the details and will advise you on the next course of action.",
    actionRequired:
      "Please wait for guidance from your consultant before taking any action. We will contact you shortly with a plan.",
  },
  additional_documents_requested: {
    title: "Additional documents requested by IRCC",
    heading: "IRCC has requested additional documents",
    body: "Immigration, Refugees and Citizenship Canada has requested additional documents for your application. You may receive a separate link to upload these documents through our secure portal.",
    actionRequired:
      "Please gather the requested documents and upload them as soon as possible. Your consultant will provide the list and any specific instructions.",
  },
  passport_requested: {
    title: "Passport request received from IRCC",
    heading: "IRCC has issued a passport request on your case",
    body: "Immigration, Refugees and Citizenship Canada (IRCC) has issued a passport request (PPR) for your application. This is typically a positive sign that your application is in the final stage. Please follow the instructions in the request to submit your passport.",
    actionRequired:
      "Please submit your passport as instructed as soon as possible. Your consultant will confirm the submission method and any deadlines.",
  },
  appeal_filed: {
    title: "Appeal filed",
    heading: "An appeal has been filed for your case",
    body: "An appeal has been filed on your behalf. Our team will keep you updated on the progress and any actions required from you.",
  },
  withdrawal_requested: {
    title: "Withdrawal requested",
    heading: "A withdrawal has been requested for your case",
    body: "A withdrawal request has been initiated for your application. Your consultant will confirm the details and timeline with you.",
  },
};

export function caseEventNotificationEmail(args: Args): {
  subject: string;
  html: string;
  text: string;
} {
  const name = escapeHtml(args.clientName);
  const caseNum = escapeHtml(args.caseNumber);
  const copy = EVENT_COPY[args.eventType];

  const subject = `${copy.title} - Case ${args.caseNumber}`;

  // Build event-specific details
  const detailLines: string[] = [];
  if (args.scheduledDate) {
    detailLines.push(`<strong>Date:</strong> ${escapeHtml(args.scheduledDate)}`);
  }
  if (args.location) {
    detailLines.push(`<strong>Location:</strong> ${escapeHtml(args.location)}`);
  }
  if (args.whatWasAsked) {
    detailLines.push(
      `<strong>What was requested:</strong> ${escapeHtml(args.whatWasAsked)}`,
    );
  }
  if (args.dueDate) {
    detailLines.push(`<strong>Due date:</strong> ${escapeHtml(args.dueDate)}`);
  }
  if (args.documentList && args.documentList.length > 0) {
    detailLines.push(
      `<strong>Documents needed:</strong><ul style="margin:4px 0 0;padding-left:20px;">${args.documentList.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}</ul>`,
    );
  }

  const detailBlock =
    detailLines.length > 0
      ? `<div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;font-size:14px;line-height:1.8;color:#374151;">${detailLines.join("<br/>")}</div>`
      : "";

  const noteBlock = args.staffNote
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #94a3b8;font-size:14px;line-height:1.6;color:#475569;"><strong>Note from your consultant:</strong><br/>${escapeHtml(args.staffNote)}</p>`
    : "";

  const actionBlock = copy.actionRequired
    ? `<p style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;font-size:14px;line-height:1.6;color:#92400e;"><strong>Action required:</strong> ${escapeHtml(copy.actionRequired)}</p>`
    : "";

  const attachmentLine = args.hasAttachment
    ? `<p style="margin:12px 0;font-size:14px;color:#374151;">A relevant document is attached to this email for your reference.</p>`
    : "";

  const bodyHtml = `
    <p style="margin:0 0 8px;font-size:14px;color:#374151;">
      Dear ${name},
    </p>
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#1f2937;">
      ${escapeHtml(copy.heading)}
    </h1>
    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">
      Case ${caseNum}
    </p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">
      ${escapeHtml(copy.body)}
    </p>
    ${detailBlock}
    ${actionBlock}
    ${noteBlock}
    ${attachmentLine}
    <p style="margin:16px 0;font-size:14px;color:#6b7280;">
      If you have any questions, please contact your consultant or email
      us at info@bigbangimmigration.com.
    </p>
  `;

  const textParts = [
    `Dear ${args.clientName},`,
    "",
    copy.heading,
    `Case ${args.caseNumber}`,
    "",
    copy.body,
  ];
  if (args.scheduledDate) textParts.push(`Date: ${args.scheduledDate}`);
  if (args.location) textParts.push(`Location: ${args.location}`);
  if (args.whatWasAsked) textParts.push(`What was requested: ${args.whatWasAsked}`);
  if (args.dueDate) textParts.push(`Due date: ${args.dueDate}`);
  if (args.documentList?.length) {
    textParts.push("Documents needed:");
    for (const d of args.documentList) textParts.push(`  - ${d}`);
  }
  if (copy.actionRequired) {
    textParts.push("", `Action required: ${copy.actionRequired}`);
  }
  if (args.staffNote) {
    textParts.push("", `Note from your consultant: ${args.staffNote}`);
  }
  if (args.hasAttachment) {
    textParts.push("", "A relevant document is attached to this email.");
  }
  textParts.push(
    "",
    "If you have any questions, please contact your consultant.",
  );

  return {
    subject,
    html: emailLayout({ previewText: subject, bodyHtml }),
    text: textParts.join("\n"),
  };
}
