/**
 * Sending mail from a firm's own connected account.
 *
 * Both providers take the message in a different shape: Graph wants JSON,
 * Gmail wants a base64url-encoded RFC 2822 message. The RFC 2822 builder is
 * pure and tested; the two senders are thin transport wrappers.
 */

export type OutgoingMail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: { filename: string; content: Uint8Array }[];
};

/** Fold a base64 body to 76 columns as RFC 2045 requires. */
function fold(b64: string): string {
  return b64.replace(/(.{76})/g, "$1\r\n");
}

/** RFC 2047 encode a header value if it carries non-ASCII. */
function headerValue(value: string): string {
  return /^[\x20-\x7E]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** Only the characters a MIME boundary may safely contain. */
function boundary(tag: string): string {
  return `=_${tag}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Builds the raw message Gmail expects: multipart/alternative for text +
 * HTML, wrapped in multipart/mixed when there are attachments.
 */
export function buildRfc822(
  from: string,
  mail: OutgoingMail,
): string {
  const altB = boundary("alt");
  const mixB = boundary("mix");

  const alternative =
    `--${altB}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${fold(Buffer.from(mail.text ?? "", "utf8").toString("base64"))}\r\n` +
    `--${altB}\r\n` +
    `Content-Type: text/html; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${fold(Buffer.from(mail.html, "utf8").toString("base64"))}\r\n` +
    `--${altB}--`;

  const headers = [
    `From: ${from}`,
    `To: ${Array.isArray(mail.to) ? mail.to.join(", ") : mail.to}`,
    mail.replyTo ? `Reply-To: ${mail.replyTo}` : null,
    `Subject: ${headerValue(mail.subject)}`,
    `MIME-Version: 1.0`,
  ].filter(Boolean);

  if (!mail.attachments?.length) {
    return (
      [...headers, `Content-Type: multipart/alternative; boundary="${altB}"`].join("\r\n") +
      `\r\n\r\n${alternative}`
    );
  }

  const parts = mail.attachments.map((a) => {
    const name = headerValue(a.filename);
    return (
      `--${mixB}\r\n` +
      `Content-Type: application/octet-stream; name="${name}"\r\n` +
      `Content-Disposition: attachment; filename="${name}"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${fold(Buffer.from(a.content).toString("base64"))}`
    );
  });

  return (
    [...headers, `Content-Type: multipart/mixed; boundary="${mixB}"`].join("\r\n") +
    `\r\n\r\n--${mixB}\r\n` +
    `Content-Type: multipart/alternative; boundary="${altB}"\r\n\r\n` +
    `${alternative}\r\n` +
    parts.join("\r\n") +
    `\r\n--${mixB}--`
  );
}

export async function sendViaGmail(
  token: string,
  from: string,
  mail: OutgoingMail,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const raw = Buffer.from(buildRfc822(from, mail), "utf8").toString("base64url");
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );
  if (!res.ok) {
    return { ok: false, error: `Gmail ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` };
  }
  const json = (await res.json()) as { id: string };
  return { ok: true, id: json.id };
}

export async function sendViaGraph(
  token: string,
  mail: OutgoingMail,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // Graph sends as the signed-in user; From is implied by the token.
  const message = {
    subject: mail.subject,
    body: { contentType: "HTML", content: mail.html },
    toRecipients: (Array.isArray(mail.to) ? mail.to : [mail.to]).map(
      (address) => ({ emailAddress: { address } }),
    ),
    ...(mail.replyTo
      ? { replyTo: [{ emailAddress: { address: mail.replyTo } }] }
      : {}),
    ...(mail.attachments?.length
      ? {
          attachments: mail.attachments.map((a) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.filename,
            contentBytes: Buffer.from(a.content).toString("base64"),
          })),
        }
      : {}),
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!res.ok) {
    return { ok: false, error: `Graph ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` };
  }
  // sendMail returns 202 with no body; there is no message id to hand back.
  return { ok: true, id: `graph-${Date.now()}` };
}
