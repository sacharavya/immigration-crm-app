/**
 * One-shot: send a test email via Resend using the firm's configured
 * FROM_ADDRESS, to verify domain + DKIM are wired correctly.
 *
 * Run:  npm run mail:test -- you@example.com
 *       (or:  tsx --env-file=.env.local scripts/test-resend.ts you@example.com)
 */

import { Resend } from "resend";

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes("@")) {
    throw new Error("Pass a recipient email, e.g. you@example.com");
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY in env");
  }

  const from =
    process.env.RESEND_FROM_ADDRESS ??
    "genzdatalabs Immigration <noreply@genzdatalabs.com>";
  const replyTo =
    process.env.RESEND_REPLY_TO ?? "info@genzdatalabs.com";

  const client = new Resend(apiKey);
  const subject = "genzdatalabs Immigration — Resend test";
  const html = `
    <p>Hello,</p>
    <p>This is a test email sent from the genzdatalabs Immigration CRM via Resend.</p>
    <p>If you received this, the domain + DKIM are wired correctly.</p>
    <p>
      <strong>From:</strong> ${from}<br />
      <strong>Reply-To:</strong> ${replyTo}<br />
      <strong>Sent at:</strong> ${new Date().toISOString()}
    </p>
  `;
  const text = `genzdatalabs Immigration — Resend test\n\nFrom: ${from}\nReply-To: ${replyTo}\nSent at: ${new Date().toISOString()}`;

  console.log(`Sending test to ${to} from ${from}…`);
  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) {
    console.error("Resend error:", error);
    process.exit(1);
  }
  if (!data?.id) {
    console.error("Resend returned no message id");
    process.exit(1);
  }
  console.log("Sent ok. Message id:", data.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
