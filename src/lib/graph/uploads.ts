import { isStorageKey, storageForKey } from "@/lib/storage/provider";

import { graphFetch } from "./client";
import { putUploadSession, type UploadedDriveItem } from "./upload-session";

export type { UploadedDriveItem } from "./upload-session";

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

  // A storage key ("t:<firm>:<provider>") means the firm's resolved store —
  // R2, a connected drive, or the platform library — not a raw Graph drive.
  if (isStorageKey(driveId)) {
    const store = await storageForKey(driveId);
    const bytes =
      content instanceof Blob
        ? new Uint8Array(await content.arrayBuffer())
        : content instanceof Uint8Array
          ? content
          : new Uint8Array(content);
    const item = await store.uploadFile(parentItemId, fileName, bytes, mimeType);
    return { id: item.id, name: item.name, webUrl: item.webUrl, size: item.size, file: { mimeType: item.mimeType } };
  }

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
