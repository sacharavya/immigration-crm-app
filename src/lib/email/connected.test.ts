/**
 * Tests for the RFC 2822 message Gmail is handed. Run via: npm test.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildRfc822 } from "./connected";

const base = {
  to: "client@example.com",
  subject: "Your retainer is ready",
  html: "<p>Hello <b>there</b></p>",
  text: "Hello there",
};

function decodeB64Section(raw: string, contentType: string): string {
  const idx = raw.indexOf(`Content-Type: ${contentType}`);
  assert.ok(idx >= 0, `missing part ${contentType}`);
  const bodyStart = raw.indexOf("\r\n\r\n", idx) + 4;
  const bodyEnd = raw.indexOf("\r\n--", bodyStart);
  return Buffer.from(raw.slice(bodyStart, bodyEnd).replace(/\r\n/g, ""), "base64").toString("utf8");
}

describe("buildRfc822", () => {
  it("carries the headers Gmail needs to route and display it", () => {
    const raw = buildRfc822("Firm <info@firm.test>", base);
    assert.match(raw, /^From: Firm <info@firm\.test>\r\n/);
    assert.match(raw, /\r\nTo: client@example\.com\r\n/);
    assert.match(raw, /\r\nSubject: Your retainer is ready\r\n/);
    assert.match(raw, /\r\nMIME-Version: 1\.0\r\n/);
  });

  it("includes both text and html, base64 encoded, and they decode back", () => {
    const raw = buildRfc822("info@firm.test", base);
    assert.equal(decodeB64Section(raw, 'text/plain; charset="UTF-8"'), base.text);
    assert.equal(decodeB64Section(raw, 'text/html; charset="UTF-8"'), base.html);
  });

  it("uses multipart/alternative when there are no attachments", () => {
    const raw = buildRfc822("info@firm.test", base);
    assert.match(raw, /Content-Type: multipart\/alternative; boundary="/);
    assert.doesNotMatch(raw, /multipart\/mixed/);
  });

  it("wraps in multipart/mixed and attaches files when present", () => {
    const raw = buildRfc822("info@firm.test", {
      ...base,
      attachments: [{ filename: "retainer.pdf", content: new Uint8Array([0x25, 0x50, 0x44, 0x46]) }],
    });
    assert.match(raw, /Content-Type: multipart\/mixed; boundary="/);
    assert.match(raw, /Content-Disposition: attachment; filename="retainer\.pdf"/);
    // %PDF in base64
    assert.match(raw, /JVBERg==/);
  });

  it("adds Reply-To only when asked", () => {
    assert.doesNotMatch(buildRfc822("a@b.test", base), /Reply-To/);
    assert.match(buildRfc822("a@b.test", { ...base, replyTo: "r@b.test" }), /\r\nReply-To: r@b\.test\r\n/);
  });

  it("encodes a non-ASCII subject per RFC 2047 rather than sending raw bytes", () => {
    const raw = buildRfc822("a@b.test", { ...base, subject: "Réunion — détails" });
    assert.match(raw, /Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=\r\n/);
  });

  it("folds long base64 bodies to 76 columns", () => {
    const raw = buildRfc822("a@b.test", { ...base, text: "x".repeat(500), html: "y".repeat(500) });
    const body = raw.slice(raw.indexOf("Content-Transfer-Encoding: base64\r\n\r\n") + 37);
    for (const line of body.split("\r\n").filter((l) => /^[A-Za-z0-9+/=]+$/.test(l))) {
      assert.ok(line.length <= 76, `line too long: ${line.length}`);
    }
  });

  it("closes every boundary it opens", () => {
    const raw = buildRfc822("a@b.test", {
      ...base,
      attachments: [{ filename: "a.txt", content: new Uint8Array([65]) }],
    });
    const opened = raw.match(/boundary="([^"]+)"/g)?.map((m) => m.slice(10, -1)) ?? [];
    assert.equal(opened.length, 2);
    for (const b of opened) assert.match(raw, new RegExp(`--${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}--`));
  });
});
