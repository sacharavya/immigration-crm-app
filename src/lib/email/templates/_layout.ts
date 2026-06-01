// Shared HTML chrome for transactional emails. Inline-styled because
// most clients (Gmail, Outlook) strip <style> tags.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Logo must be an absolute URL — email clients refuse relative paths and
// most strip data URIs. Resolved from NEXT_PUBLIC_APP_URL so dev (Vercel
// preview / localhost-tunnel) and prod each point at their own /logo.png.
function logoUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.bigbangimmigration.com";
  return `${base.replace(/\/$/, "")}/logo.png`;
}

export function emailLayout(args: { previewText?: string; bodyHtml: string }): string {
  const preview = args.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(args.previewText)}</div>`
    : "";
  const logo = logoUrl();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Big Bang Immigration</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
    ${preview}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f4;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 16px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:14px;">
                      <img src="${escapeHtml(logo)}" alt="Big Bang Immigration" width="48" height="48" style="display:block;border:0;outline:none;text-decoration:none;width:48px;height:48px;border-radius:8px;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <div style="font-weight:700;font-size:18px;color:#0c0a09;letter-spacing:-0.01em;line-height:1.2;">Big Bang Immigration</div>
                      <div style="font-size:12px;color:#78716c;margin-top:2px;line-height:1.2;">Consulting Inc.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px;font-size:15px;line-height:1.55;color:#1c1917;">
                ${args.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#fafaf9;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;line-height:1.6;">
                Big Bang Immigration Consulting Inc.<br />
                211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5<br />
                +1 416-386-5351 &nbsp;&middot;&nbsp; info@bigbangimmigration.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buttonHtml(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background:#0c0a09;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}
