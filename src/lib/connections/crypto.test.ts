/**
 * Tests for third-party token encryption.
 *
 * Run via: npm test (node:test through tsx).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Set before any test runs. crypto.ts reads the key lazily inside key(),
// not at import time, so a static import is fine.
process.env.TOKEN_ENCRYPTION_KEY =
  "test-key-that-is-definitely-long-enough-for-aes";

import { decryptToken, encryptToken, encryptionConfigured } from "./crypto";

describe("token encryption", () => {
  it("round-trips a token", () => {
    const token = "1//0gxyz-a-realistic-looking-refresh-token_ABC123";
    assert.equal(decryptToken(encryptToken(token)), token);
  });

  it("produces different ciphertext each time for the same input", () => {
    // A fixed IV would let an observer see that two firms share a token, or
    // that a token was unchanged across a rotation.
    const a = encryptToken("same-token");
    const b = encryptToken("same-token");
    assert.notEqual(a, b);
    assert.equal(decryptToken(a), decryptToken(b));
  });

  it("carries a version tag so the key can be rotated later", () => {
    assert.match(encryptToken("x"), /^v1\./);
  });

  it("never leaks the plaintext into the stored payload", () => {
    const secret = "super-secret-refresh-token";
    assert.ok(!encryptToken(secret).includes(secret));
  });

  it("refuses tampered ciphertext rather than returning garbage", () => {
    const payload = encryptToken("token");
    const parts = payload.split(".");
    // flip the last character of the ciphertext
    const last = parts[3];
    parts[3] = last.slice(0, -1) + (last.at(-1) === "A" ? "B" : "A");
    assert.throws(() => decryptToken(parts.join(".")));
  });

  it("refuses a payload whose auth tag was swapped", () => {
    const a = encryptToken("token-one").split(".");
    const b = encryptToken("token-two").split(".");
    assert.throws(() => decryptToken([a[0], a[1], b[2], a[3]].join(".")));
  });

  it("rejects a malformed payload", () => {
    assert.throws(() => decryptToken("not-a-payload"));
    assert.throws(() => decryptToken("v9.a.b.c"));
  });

  it("reports whether a key is configured", () => {
    assert.equal(encryptionConfigured(), true);
  });
});
