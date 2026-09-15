/**
 * Pure storage-config resolution. Kept out of settings.ts (which is
 * server-only, so it can hold the service-role fetch) purely so this
 * logic stays importable from tests.
 */

export type StorageProvider = "onedrive" | "google_drive";

export type StorageSettings = {
  provider: StorageProvider;
  /** Document library / shared drive id, or null when unconfigured. */
  driveId: string | null;
  /** Path prefix anchoring case folders. "" anchors at the drive root. */
  rootFolder: string;
};

/** The stored row, as read from crm.storage_settings. */
export type StorageSettingsRow = {
  provider: string;
  drive_id: string | null;
  root_folder: string;
};

/** The env vars that configured storage before the settings row existed. */
export type StorageEnv = {
  driveId?: string | null;
  rootFolder?: string | null;
};

export const PROVIDER_LABELS: Record<StorageProvider, string> = {
  onedrive: "Microsoft OneDrive / SharePoint",
  google_drive: "Google Drive",
};

/** Providers with a working adapter. Google Drive is schema-only for now. */
export const IMPLEMENTED_PROVIDERS: ReadonlySet<StorageProvider> = new Set([
  "onedrive",
]);

/**
 * Merges the stored row over the env vars. The row wins on every field it
 * actually sets; a blank drive id falls back to the env var so an existing
 * deployment keeps working until someone saves the settings page. A null
 * row (migration not applied on some environment) degrades to pure env
 * config rather than throwing, so uploads don't break on deploy ordering.
 */
export function resolveStorageSettings(
  row: StorageSettingsRow | null,
  env: StorageEnv,
): StorageSettings {
  const envDriveId = env.driveId?.trim() || null;
  const envRootFolder = env.rootFolder?.trim() ?? "";

  return {
    provider: isProvider(row?.provider) ? row.provider : "onedrive",
    driveId: row?.drive_id?.trim() || envDriveId,
    rootFolder: row ? row.root_folder.trim() : envRootFolder,
  };
}

/**
 * Narrows resolved settings to a working OneDrive configuration for the
 * Graph layer, or explains why it can't. Returns the reason rather than
 * throwing so the message has one definition and the caller keeps the
 * stack.
 */
export function oneDriveConfigError(settings: StorageSettings): string | null {
  if (settings.provider !== "onedrive") {
    return (
      `Storage provider is set to ${PROVIDER_LABELS[settings.provider]}, which has no adapter yet. ` +
      "Switch it back to OneDrive in Settings → Storage."
    );
  }
  if (!settings.driveId) {
    return "No document library configured. Set one in Settings → Storage (or GRAPH_DOCUMENT_LIBRARY_ID).";
  }
  return null;
}

export function isProvider(value: unknown): value is StorageProvider {
  return value === "onedrive" || value === "google_drive";
}
