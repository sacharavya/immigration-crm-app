/**
 * Shared upload constants. Imported by both the client component (for
 * pre-flight validation, so users see a friendly error before the file
 * even leaves the browser) and the server action (defense in depth —
 * the client check is just UX).
 *
 * The 4MB cap matches Microsoft Graph's small-file upload endpoint.
 * Larger uploads would require an upload session, which is out of scope
 * for v1.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_MIME_TYPES_SET: ReadonlySet<string> = new Set(
  ALLOWED_MIME_TYPES,
);

export const ALLOWED_EXTENSIONS_HUMAN = "PDF, JPG, PNG, HEIC, DOC, or DOCX";

export function formatBytesMb(bytes: number): string {
  return (bytes / 1_048_576).toFixed(1);
}
