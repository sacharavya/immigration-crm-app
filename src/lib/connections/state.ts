/**
 * The OAuth `state` parameter.
 *
 * state is the CSRF defence for the whole flow: without it, an attacker can
 * hand a firm's admin a crafted callback URL and graft their own account onto
 * that firm — or graft the firm's account onto another tenant. So it is
 * signed, carries the tenant it was issued for, and expires.
 *
 * HMAC over a compact payload rather than a random nonce in a cookie: the
 * callback lands on a fresh request and this way it needs no session at all,
 * which matters because the provider redirect can arrive in a different
 * browser context.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import type { ProviderId } from "./providers";

const TTL_MS = 10 * 60 * 1000; // a consent screen nobody finishes in 10 min is abandoned

export type OAuthState = {
  tenantId: string;
  provider: ProviderId;
  staffId: string;
  issuedAt: number;
};

function secret(): string {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to sign OAuth state.");
  }
  return raw;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeState(
  state: Omit<OAuthState, "issuedAt"> & { issuedAt?: number },
): string {
  const full: OAuthState = { ...state, issuedAt: state.issuedAt ?? Date.now() };
  const payload = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export type StateResult =
  | { ok: true; state: OAuthState }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function decodeState(raw: string | null): StateResult {
  if (!raw || !raw.includes(".")) return { ok: false, reason: "malformed" };

  const idx = raw.lastIndexOf(".");
  const payload = raw.slice(0, idx);
  const provided = raw.slice(idx + 1);

  const expected = sign(payload);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Length check first: timingSafeEqual throws on a mismatch.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed: OAuthState;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (
    typeof parsed?.tenantId !== "string" ||
    typeof parsed?.staffId !== "string" ||
    (parsed.provider !== "microsoft" && parsed.provider !== "google") ||
    typeof parsed.issuedAt !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }

  if (Date.now() - parsed.issuedAt > TTL_MS) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true, state: parsed };
}
