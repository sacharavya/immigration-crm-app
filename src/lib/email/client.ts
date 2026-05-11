import "server-only";

import { Resend } from "resend";

// Singleton Resend client. Instantiating once keeps connection pooling
// behaviour predictable across server actions.
let _client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_client) _client = new Resend(key);
  return _client;
}

export const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS ??
  "Big Bang Immigration <crm@crm.bigbangimmigration.com>";

export const REPLY_TO =
  process.env.RESEND_REPLY_TO ?? "info@bigbangimmigration.com";

export type EmailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
};

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Sends an email via Resend with graceful fallback. If the API key is
// missing the call returns ok:false rather than throwing — callers
// should treat email as a best-effort side channel and never block
// their primary flow on it.
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo ?? REPLY_TO,
      attachments: args.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content)
          ? a.content
          : Buffer.from(a.content),
      })),
    });
    if (error) return { ok: false, error: error.message };
    if (!data?.id) return { ok: false, error: "No message id from Resend" };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
