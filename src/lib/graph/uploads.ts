import { graphFetch } from "./client";

export type UploadedDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  file?: { mimeType?: string };
};

const SMALL_UPLOAD_LIMIT_BYTES = 4 * 1024 * 1024;

export type UploadContent = ArrayBuffer | Uint8Array | Blob;

/**
 * Upload a file to a drive folder. Under 4 MB the simple PUT endpoint; above
 * it, an upload session. Our ceiling is 10 MB and a session accepts chunks up
 * to 60 MiB, so the whole file goes in one PUT either way.
 */
export async function uploadFile(
  driveId: string,
  parentItemId: string,
  fileName: string,
  content: UploadContent,
  mimeType: string,
): Promise<UploadedDriveItem> {
  const size =
    content instanceof Blob
      ? content.size
      : content instanceof Uint8Array
        ? content.byteLength
        : content.byteLength;

  const itemPath = `/drives/${driveId}/items/${parentItemId}:/${encodeURIComponent(fileName)}:`;

  if (size <= SMALL_UPLOAD_LIMIT_BYTES) {
    return graphFetch<UploadedDriveItem>(`${itemPath}/content`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: content as BodyInit,
    });
  }

  const session = await graphFetch<{ uploadUrl: string }>(`${itemPath}/createUploadSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item: { "@microsoft.graph.conflictBehavior": "rename", name: fileName } }),
  });
  return putUploadSession(session.uploadUrl, content as BodyInit, size);
}

/**
 * The session URL is pre-authorised; Graph rejects an Authorization header on
 * it, so this is a plain fetch rather than graphFetch.
 */
export async function putUploadSession(
  uploadUrl: string,
  body: BodyInit,
  size: number,
): Promise<UploadedDriveItem> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(size),
      "Content-Range": `bytes 0-${size - 1}/${size}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph upload session ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as UploadedDriveItem;
}
