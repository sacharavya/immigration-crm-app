import "server-only";

import { getAccessToken as platformGraphToken } from "@/lib/graph/auth";
import { getAccessToken as connectionToken } from "@/lib/connections/store";
import { capabilitiesFor } from "@/lib/connections/providers";

import type { StorageAdapter } from "./adapter";
import { GoogleDriveAdapter } from "./adapters/google-drive";
import { OneDriveAdapter } from "./adapters/onedrive";
import { R2Adapter, r2Configured } from "./adapters/r2";
import { getStorageSettings } from "./settings";

/**
 * The document store for a firm, and the key that names it.
 *
 * Resolution order:
 *   1. A connected account whose grant covers files → that firm's own drive,
 *      through their own token. The firm chose this in Settings → Storage.
 *   2. A OneDrive library the firm named explicitly in its storage settings
 *      → the platform's Graph app against that library.
 *   3. Otherwise the platform's object store (R2). This is the default: a
 *      new firm can upload from day one without connecting anything.
 *
 * The key ("t:<firm id>:<provider>") is what gets stored on each document
 * as its drive id, so a file can be read back from the store it went into
 * even after the firm changes provider.
 */
export type ResolvedStorage = { storage: StorageAdapter; key: string };

type KeyProvider = "r2" | "onedrive" | "google" | "library";
const KEY_RE = /^t:([0-9a-f-]{36}):(r2|onedrive|google|library)$/i;

export function isStorageKey(value: string | null | undefined): boolean {
  return Boolean(value && KEY_RE.test(value));
}

export async function resolveStorage(tenantId: string): Promise<ResolvedStorage> {
  const conn = await connectedStorage(tenantId);
  if (conn) return conn;

  const settings = await getStorageSettings(tenantId);
  if (settings.provider === "onedrive" && settings.driveId) {
    return { storage: await platformLibrary(tenantId), key: keyFor(tenantId, "library") };
  }

  if (r2Configured()) {
    return { storage: new R2Adapter(tenantId), key: keyFor(tenantId, "r2") };
  }

  throw new Error(
    "No document storage is set up for this firm. Connect a Microsoft or Google account in Settings → Storage, or configure R2 on the platform.",
  );
}

export async function getStorage(tenantId: string): Promise<StorageAdapter> {
  return (await resolveStorage(tenantId)).storage;
}

/** The store a stored key points at — the one the file actually went into. */
export async function storageForKey(key: string): Promise<StorageAdapter> {
  const m = KEY_RE.exec(key);
  if (!m) throw new Error(`Not a storage key: ${key}`);
  const [, tenantId, provider] = m as unknown as [string, string, KeyProvider];

  if (provider === "r2") {
    if (!r2Configured()) throw new Error("R2 storage is not configured on this deployment.");
    return new R2Adapter(tenantId);
  }
  if (provider === "library") return platformLibrary(tenantId);

  const conn = await connectedStorage(tenantId);
  if (!conn || !conn.key.endsWith(`:${provider}`)) {
    throw new Error("This file lives in a drive the firm is no longer connected to.");
  }
  return conn.storage;
}

function keyFor(tenantId: string, provider: KeyProvider): string {
  return `t:${tenantId}:${provider}`;
}

async function connectedStorage(tenantId: string): Promise<ResolvedStorage | null> {
  const conn = await connectionToken(tenantId);
  if (!conn || !capabilitiesFor(conn.connection.scopes).files) return null;
  const { connection, token } = conn;
  if (connection.provider === "google") {
    return { storage: new GoogleDriveAdapter(token, connection.rootFolderId ?? "root"), key: keyFor(tenantId, "google") };
  }
  // Microsoft: the drive is the signed-in user's own OneDrive unless the
  // firm picked a SharePoint library after connecting.
  const driveId = connection.driveId ?? (await defaultDriveId(token));
  return { storage: new OneDriveAdapter(token, driveId, connection.rootFolderId), key: keyFor(tenantId, "onedrive") };
}

/** The platform's Graph app against the library named in the firm's settings. */
async function platformLibrary(tenantId: string): Promise<StorageAdapter> {
  const settings = await getStorageSettings(tenantId);
  if (!settings.driveId) {
    throw new Error("This firm's document library is no longer configured.");
  }
  const adapter = new OneDriveAdapter(await platformGraphToken(), settings.driveId);
  // The legacy root folder prefix ("Test-CRM") becomes the first path
  // segments; resolve it once so the adapter's root is that folder.
  const prefix = settings.rootFolder.split("/").map((s) => s.trim()).filter(Boolean);
  if (prefix.length === 0) return adapter;
  const root = await adapter.ensureFolderPath(prefix);
  return new OneDriveAdapter(await platformGraphToken(), settings.driveId, root.id);
}

/** The connected user's own OneDrive. */
async function defaultDriveId(token: string): Promise<string> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/drive?$select=id", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Could not read the connected OneDrive: ${res.status}`);
  return ((await res.json()) as { id: string }).id;
}
