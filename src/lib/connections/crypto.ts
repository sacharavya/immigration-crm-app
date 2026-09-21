/**
 * Envelope encryption for third-party refresh tokens.
 *
 * A stored refresh token is long-lived access to a firm's whole mailbox and
 * drive — a worse thing to leak than any single document. Two layers keep it
 * out of reach: the table grants nothing to `authenticated`, so no session
 * can read even the ciphertext, and the ciphertext is useless without a key
 * that lives in the environment rather than the database. A database dump on
 * its own therefore yields nothing.
 *
 * AES-256-GCM, so tampering is detected rather than silently decrypted. The
 * IV is random per encryption and stored alongside; the auth tag is appended.
 * Format is v1.<iv>.<tag>.<ciphertext>, all base64url — versioned so the key
 * or algorithm can be rotated later without guessing at old rows.
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12; // GCM standard

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is missing or too short (need 32+ characters). " +
        "Generate one with: openssl rand -base64 48",
    );
  }
  // Hash to exactly 32 bytes so any sufficiently long passphrase works,
  // rather than demanding the operator produce exact key material.
  return createHash("sha256").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptToken(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Stored token is not in the expected format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** True when a key is configured, so the UI can explain rather than throw. */
export function encryptionConfigured(): boolean {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  return Boolean(raw && raw.length >= 32);
}
