import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { sanitizeName, type StorageAdapter, type StoredItem, type StreamedFile } from "../adapter";

/**
 * The platform's own object store (Cloudflare R2, or anything S3-shaped),
 * the default for a firm that has not connected a drive of its own.
 *
 * Object storage has no folders, so a "folder id" here is simply a key
 * prefix and creating one costs nothing. Every key starts with the firm's
 * id, which keeps firms apart inside one bucket and makes a firm's files
 * trivial to export or delete as a unit.
 *
 * Configured entirely from the environment; see .env.example.
 */
export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY,
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint: process.env.R2_ENDPOINT,
      forcePathStyle: true,
      // The SDK adds CRC32 request checksums by default; R2 and other
      // S3-compatible stores reject or stall on them.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export class R2Adapter implements StorageAdapter {
  readonly provider = "r2" as const;
  private readonly bucket = process.env.R2_BUCKET!;

  constructor(private readonly tenantId: string) {}

  async ensureFolderPath(segments: string[]) {
    const id = [this.tenantId, ...segments.map(sanitizeName).filter(Boolean)].join("/");
    return { id, webUrl: "" };
  }

  async ensureChildFolder(parentId: string, name: string) {
    return { id: `${parentId}/${sanitizeName(name)}`, webUrl: "" };
  }

  async uploadFile(parentId: string, fileName: string, content: Uint8Array, mimeType: string): Promise<StoredItem> {
    const name = sanitizeName(fileName);
    const Key = `${parentId}/${name}`;
    await s3().send(
      new PutObjectCommand({ Bucket: this.bucket, Key, Body: content, ContentType: mimeType, ContentLength: content.byteLength }),
    );
    return { id: Key, name, webUrl: "", size: content.byteLength, mimeType };
  }

  // `format: "pdf"` asks for an Office→PDF conversion, which only the
  // drives offer; the original is served instead and the viewer handles it.
  async streamFile(itemId: string): Promise<StreamedFile> {
    const res = await s3().send(new GetObjectCommand({ Bucket: this.bucket, Key: itemId }));
    if (!res.Body) throw new Error("R2 returned an empty body");
    return {
      body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      contentType: res.ContentType ?? "application/octet-stream",
      contentLength: res.ContentLength != null ? String(res.ContentLength) : null,
    };
  }

  // Copy + delete, reading the bytes through us rather than CopyObject:
  // S3-compatible stores disagree on how the copy-source key must be
  // encoded, and a file is at most 10 MB, so the round trip is cheap.
  async moveAndRename(itemId: string, newParentId: string, newName: string): Promise<StoredItem> {
    const name = sanitizeName(newName);
    const Key = `${newParentId}/${name}`;
    const src = await s3().send(new GetObjectCommand({ Bucket: this.bucket, Key: itemId }));
    if (!src.Body) throw new Error("R2 returned an empty body");
    const bytes = await src.Body.transformToByteArray();
    await s3().send(
      new PutObjectCommand({ Bucket: this.bucket, Key, Body: bytes, ContentType: src.ContentType, ContentLength: bytes.byteLength }),
    );
    await s3().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: itemId }));
    return { id: Key, name, webUrl: "", size: bytes.byteLength, mimeType: src.ContentType };
  }
}
