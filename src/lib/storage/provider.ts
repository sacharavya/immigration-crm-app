import "server-only";

import { getAccessToken as platformGraphToken } from "@/lib/graph/auth";
import { getAccessToken as connectionToken } from "@/lib/connections/store";
import { capabilitiesFor } from "@/lib/connections/providers";

import type { StorageAdapter } from "./adapter";
import { GoogleDriveAdapter } from "./adapters/google-drive";
import { OneDriveAdapter } from "./adapters/onedrive";
import { getStorageSettings } from "./settings";

/**
 * The document store for a firm.
 *
 * Resolution order:
 *   1. A connected account whose grant covers files → that firm's own drive,
 *      through their own token.
 *   2. Otherwise the firm's storage_settings row → the platform's Graph app
 *      against the library it names.
 *
 * Case 2 is the pre-connection world and is what keeps an existing firm
 * working while they decide whether to connect. New firms are steered to
 * connect during onboarding, so 2 becomes the exception rather than the
 * default.
 */
export async function getStorage(tenantId: string): Promise<StorageAdapter> {
  const conn = await connectionToken(tenantId);

  if (conn && capabilitiesFor(conn.connection.scopes).files) {
    const { connection, token } = conn;
    if (connection.provider === "google") {
      return new GoogleDriveAdapter(token, connection.rootFolderId ?? "root");
    }
    // Microsoft: the drive is the signed-in user's own OneDrive unless the
    // firm picked a SharePoint library after connecting.
    const driveId = connection.driveId ?? (await defaultDriveId(token));
    return new OneDriveAdapter(token, driveId, connection.rootFolderId);
  }

  const settings = await getStorageSettings(tenantId);
  if (settings.provider !== "onedrive" || !settings.driveId) {
    throw new Error(
      "No document storage is set up for this firm. Connect a Microsoft or Google account in Settings → Site settings.",
    );
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
