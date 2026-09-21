/**
 * What a document store has to be able to do, regardless of which cloud
 * it is.
 *
 * Everything the app needs from OneDrive or Google Drive fits in four
 * operations. Folder paths are expressed as segments, not slashes, because
 * the two providers escape names differently and the app should not know.
 *
 * Ids are opaque strings from the provider. They are stored on
 * files.documents as before (the columns are still called sharepoint_* for
 * history; both providers' ids go in them).
 */

export type StoredItem = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType?: string;
};

export type StreamedFile = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: string | null;
};

export interface StorageAdapter {
  readonly provider: "onedrive" | "google_drive";

  /**
   * Returns the id of the folder at `segments` beneath the root, creating
   * any missing levels. Idempotent: an existing folder is reused, never
   * duplicated.
   */
  ensureFolderPath(segments: string[]): Promise<{ id: string; webUrl: string }>;

  /** Returns the id of the named child folder under `parentId`, creating it. */
  ensureChildFolder(parentId: string, name: string): Promise<{ id: string; webUrl: string }>;

  uploadFile(
    parentId: string,
    fileName: string,
    content: Uint8Array,
    mimeType: string,
  ): Promise<StoredItem>;

  streamFile(itemId: string, opts?: { format?: "pdf" }): Promise<StreamedFile>;

  moveAndRename(
    itemId: string,
    newParentId: string,
    newName: string,
  ): Promise<StoredItem>;
}

/** Characters no cloud provider accepts in a name, collapsed to underscore. */
export function sanitizeName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}
