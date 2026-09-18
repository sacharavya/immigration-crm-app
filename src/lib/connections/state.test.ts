/**
 * Tests for the OAuth state parameter — the CSRF defence for account
 * connection. Run via: npm test.
 */
process.env.TOKEN_ENCRYPTION_KEY =
  "test-key-that-is-definitely-long-enough-for-aes";

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { decodeState, encodeState } from "./state";

const base = {
  tenantId: "11111111-1111-1111-1111-111111111111",
  provider: "microsoft" as const,
  staffId: "22222222-2222-2222-2222-222222222222",
};

describe("oauth state", () => {
  it("round-trips the tenant, provider and staff member", () => {
    const r = decodeState(encodeState(base));
    assert.ok(r.ok);
    assert.equal(r.state.tenantId, base.tenantId);
    assert.equal(r.state.provider, "microsoft");
    assert.equal(r.state.staffId, base.staffId);
  });

  it("rejects a forged state", () => {
    // Without this, a crafted callback could graft an attacker's account
    // onto someone else's firm.
    const forged = Buffer.from(
      JSON.stringify({ ...base, issuedAt: Date.now() }),
    ).toString("base64url");
    const r = decodeState(`${forged}.not-a-real-signature`);
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "bad_signature");
  });

  it("rejects a state whose tenant was swapped after signing", () => {
    const good = encodeState(base);
    const [payload, sig] = good.split(".");
    const tampered = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    tampered.tenantId = "33333333-3333-3333-3333-333333333333";
    const swapped = Buffer.from(JSON.stringify(tampered)).toString("base64url");
    const r = decodeState(`${swapped}.${sig}`);
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "bad_signature");
  });

  it("expires after ten minutes", () => {
    const old = encodeState({ ...base, issuedAt: Date.now() - 11 * 60 * 1000 });
    const r = decodeState(old);
    assert.equal(r.ok, false);
    assert.equal(r.ok === false && r.reason, "expired");
  });

  it("accepts one issued just now", () => {
    assert.ok(decodeState(encodeState({ ...base, issuedAt: Date.now() })).ok);
  });

  it("rejects missing or malformed input", () => {
    assert.equal(decodeState(null).ok, false);
    assert.equal(decodeState("").ok, false);
    assert.equal(decodeState("no-separator").ok, false);
  });

  it("rejects an unknown provider", () => {
    const payload = Buffer.from(
      JSON.stringify({ ...base, provider: "dropbox", issuedAt: Date.now() }),
    ).toString("base64url");
    // sign it properly, so only the provider check can reject it
    const signed = encodeState(base).split(".")[1];
    assert.equal(decodeState(`${payload}.${signed}`).ok, false);
  });
});
