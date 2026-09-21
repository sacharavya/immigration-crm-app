import "server-only";

import type {
  StorageAdapter,
  StoredItem,
  StreamedFile,
} from "../adapter";
import { sanitizeName } from "../adapter";

/**
 * OneDrive / SharePoint through Microsoft Graph, with whichever bearer token
 * the caller resolved: a firm's own connected account, or the platform's
 * app registration for a firm that has not connected yet.
 *
 * The Graph calls here mirror src/lib/graph/*, which they will replace once
 * every caller goes through the adapter. Duplicating a few dozen lines now
 * is cheaper than making the old module token-aware and tenant-aware at the
 * same time.
 */

const GRAPH = "https://graph.microsoft.com/v1.0";
const SMALL_UPLOAD_LIMIT = 4 * 1024 * 1024;

type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  file?: { mimeType?: string };
  folder?: unknown;
};

export class OneDriveAdapter implements StorageAdapter {
  readonly provider = "onedrive" as const;

  constructor(
    private readonly token: string,
    private readonly driveId: string,
    /** Item id the case tree hangs from; null means the drive root. */
    private readonly rootItemId: string | null = null,
  ) {}

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${GRAPH}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const err = new Error(`Graph ${res.status}: ${body.slice(0, 300)}`);
      (err as Error & { status: number }).status = res.status;
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private async rootId(): Promise<string> {
    if (this.rootItemId) return this.rootItemId;
    const root = await this.api<DriveItem>(`/drives/${this.driveId}/root`);
    return root.id;
  }

  private async findChildFolder(parentId: string, name: string): Promise<DriveItem | null> {
    const escaped = name.replace(/'/g, "''");
    const list = await this.api<{ value: DriveItem[] }>(
      `/drives/${this.driveId}/items/${parentId}/children?$select=id,name,webUrl,folder&$filter=name eq '${encodeURIComponent(escaped)}'`,
    );
    return list.value.find((i) => i.folder && i.name === name) ?? null;
  }

  async ensureChildFolder(parentId: string, rawName: string) {
    const name = sanitizeName(rawName);
    const existing = await this.findChildFolder(parentId, name);
    if (existing) return { id: existing.id, webUrl: existing.webUrl };
    try {
      const created = await this.api<DriveItem>(
        `/drives/${this.driveId}/items/${parentId}/children`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail",
          }),
        },
      );
      return { id: created.id, webUrl: created.webUrl };
    } catch (err) {
      // Two uploads racing on the same new folder: one wins the create, the
      // other finds it on retry.
      if ((err as { status?: number }).status === 409) {
        const found = await this.findChildFolder(parentId, name);
        if (found) return { id: found.id, webUrl: found.webUrl };
      }
      throw err;
    }
  }

  async ensureFolderPath(segments: string[]) {
    let parent = { id: await this.rootId(), webUrl: "" };
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
    if (content.byteLength > SMALL_UPLOAD_LIMIT) {
      throw new Error(
        `${fileName} is over 4MB; Graph needs an upload session for that, which is not implemented.`,
      );
    }
    const item = await this.api<DriveItem>(
      `/drives/${this.driveId}/items/${parentId}:/${encodeURIComponent(sanitizeName(fileName))}:/content`,
      { method: "PUT", headers: { "Content-Type": mimeType }, body: content as BodyInit },
    );
    return {
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size ?? content.byteLength,
      mimeType: item.file?.mimeType,
    };
  }

  async streamFile(itemId: string, opts: { format?: "pdf" } = {}): Promise<StreamedFile> {
    const query = opts.format === "pdf" ? "?format=pdf" : "";
    const res = await fetch(
      `${GRAPH}/drives/${this.driveId}/items/${itemId}/content${query}`,
      { headers: { Authorization: `Bearer ${this.token}` }, redirect: "follow" },
    );
    if (!res.ok || !res.body) {
      await res.body?.cancel().catch(() => {});
      throw new Error(`Graph download failed: ${res.status}`);
    }
    return {
      body: res.body,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      contentLength: res.headers.get("content-length"),
    };
  }

  async moveAndRename(itemId: string, newParentId: string, newName: string): Promise<StoredItem> {
    const item = await this.api<DriveItem>(
      `/drives/${this.driveId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sanitizeName(newName),
          parentReference: { id: newParentId },
        }),
      },
    );
    return { id: item.id, name: item.name, webUrl: item.webUrl, size: item.size ?? 0 };
  }
}
