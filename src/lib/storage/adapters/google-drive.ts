import "server-only";

import type {
  StorageAdapter,
  StoredItem,
  StreamedFile,
} from "../adapter";
import { sanitizeName } from "../adapter";

/**
 * Google Drive, through the v3 REST API with a firm's own access token.
 *
 * The token was granted with drive.file, which only reaches files this app
 * created. That is exactly what we need and nothing more: connecting does
 * not expose a firm's existing Drive to the platform.
 *
 * Shared drives: a firm that picks a shared drive as its root gets
 * supportsAllDrives on every call, which is harmless on My Drive.
 */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";

type DriveFile = {
  id: string;
  name: string;
  webViewLink?: string;
  size?: string;
  mimeType?: string;
};

export class GoogleDriveAdapter implements StorageAdapter {
  readonly provider = "google_drive" as const;

  constructor(
    private readonly token: string,
    /** Folder id the case tree hangs from; "root" means My Drive. */
    private readonly rootId: string = "root",
  ) {}

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = path.startsWith("http") ? path : `${API}${path}`;
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}supportsAllDrives=true`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google Drive ${res.status}: ${body.slice(0, 300)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async findChildFolder(
    parentId: string,
    name: string,
  ): Promise<DriveFile | null> {
    // Drive's q language: escape single quotes and backslashes in the name.
    const escaped = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const q = [
      `'${parentId}' in parents`,
      `name = '${escaped}'`,
      `mimeType = '${FOLDER}'`,
      "trashed = false",
    ].join(" and ");
    const res = await this.api<{ files: DriveFile[] }>(
      `/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&includeItemsFromAllDrives=true&pageSize=1`,
    );
    return res.files[0] ?? null;
  }

  async ensureChildFolder(parentId: string, rawName: string) {
    const name = sanitizeName(rawName);
    const existing = await this.findChildFolder(parentId, name);
    if (existing) {
      return { id: existing.id, webUrl: existing.webViewLink ?? "" };
    }
    const created = await this.api<DriveFile>(
      "/files?fields=id,name,webViewLink",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType: FOLDER, parents: [parentId] }),
      },
    );
    return { id: created.id, webUrl: created.webViewLink ?? "" };
  }

  async ensureFolderPath(segments: string[]) {
    let parent = { id: this.rootId, webUrl: "" };
    for (const seg of segments.map(sanitizeName).filter(Boolean)) {
      parent = await this.ensureChildFolder(parent.id, seg);
    }
    return parent;
  }

  async uploadFile(
    parentId: string,
    fileName: string,
    content: Uint8Array,
    mimeType: string,
  ): Promise<StoredItem> {
    // Multipart upload: metadata part names the file and parent, media part
    // carries the bytes. One request, fine up to 5MB which is the app's own
    // ceiling for a client document.
    const boundary = `crm-${Date.now().toString(36)}`;
    const meta = JSON.stringify({ name: sanitizeName(fileName), parents: [parentId] });
    const head =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--`;
    const body = new Uint8Array(
      Buffer.concat([Buffer.from(head), Buffer.from(content), Buffer.from(tail)]),
    );

    const file = await this.api<DriveFile>(
      `${UPLOAD}/files?uploadType=multipart&fields=id,name,webViewLink,size,mimeType`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    return {
      id: file.id,
      name: file.name,
      webUrl: file.webViewLink ?? "",
      size: Number(file.size ?? content.byteLength),
      mimeType: file.mimeType,
    };
  }

  async streamFile(itemId: string, opts: { format?: "pdf" } = {}): Promise<StreamedFile> {
    // Office files uploaded as-is are binary blobs to Drive, so export only
    // applies to native Google Docs. For an ordinary PDF or image, alt=media
    // streams the bytes.
    const url = opts.format === "pdf"
      ? `${API}/files/${itemId}/export?mimeType=application/pdf&supportsAllDrives=true`
      : `${API}/files/${itemId}?alt=media&supportsAllDrives=true`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok || !res.body) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`Google Drive download failed: ${res.status}`);
    }
    return {
      body: res.body,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      contentLength: res.headers.get("content-length"),
    };
  }

  async moveAndRename(itemId: string, newParentId: string, newName: string): Promise<StoredItem> {
    // Drive needs the old parent removed explicitly, so read it first.
    const current = await this.api<{ parents?: string[] }>(
      `/files/${itemId}?fields=parents`,
    );
    const remove = (current.parents ?? []).join(",");
    const file = await this.api<DriveFile>(
      `/files/${itemId}?addParents=${newParentId}${remove ? `&removeParents=${remove}` : ""}&fields=id,name,webViewLink,size`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sanitizeName(newName) }),
      },
    );
    return {
      id: file.id,
      name: file.name,
      webUrl: file.webViewLink ?? "",
      size: Number(file.size ?? 0),
    };
  }
}
