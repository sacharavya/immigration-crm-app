import "server-only";

import { adminClient } from "@/lib/supabase/admin";

import {
  oneDriveConfigError,
  resolveStorageSettings,
  type StorageSettings,
  type StorageSettingsRow,
} from "./resolve";

export { rootFolderParts } from "./paths";
export {
  IMPLEMENTED_PROVIDERS,
  PROVIDER_LABELS,
  type StorageProvider,
  type StorageSettings,
} from "./resolve";

/**
 * Firm-wide storage configuration: which backend holds case files, which
 * drive/library inside it, and the optional folder the case tree is
 * anchored under.
 *
 * This module is the thin I/O wrapper — the merge rules live in
 * ./resolve.ts so they can be unit tested without a database.
 *
 * The row is read through the service-role client on purpose. It is firm
 * config, not user data, and the callers include public token flows
 * (client uploads, payment proofs) and the cron job, none of which have a
 * staff session to satisfy the RLS read policy. Because RLS is bypassed,
 * the tenant filter is the caller's responsibility — hence the required
 * tenantId.
 */
export async function getStorageSettings(
  tenantId: string,
): Promise<StorageSettings> {
  let row: StorageSettingsRow | null = null;

  try {
    const { data } = await adminClient()
      .schema("crm")
      .from("storage_settings")
      .select("provider, drive_id, root_folder")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    row = data ?? null;
  } catch {
    // Table missing or service role unavailable — fall through to env.
    row = null;
  }

  return resolveStorageSettings(row, {
    driveId: process.env.GRAPH_DOCUMENT_LIBRARY_ID,
    rootFolder: process.env.GRAPH_ROOT_FOLDER,
  });
}

/**
 * Settings narrowed to a working OneDrive configuration, for the Graph
 * layer. Throws with an actionable message when the firm has selected a
 * provider we can't talk to yet, or when no library is configured —
 * previously that second check was a bare "GRAPH_DOCUMENT_LIBRARY_ID is
 * not set" duplicated across every folder helper.
 */
export async function requireOneDriveSettings(tenantId: string): Promise<{
  driveId: string;
  rootFolder: string;
}> {
  const settings = await getStorageSettings(tenantId);

  const problem = oneDriveConfigError(settings);
  if (problem) throw new Error(problem);

  return { driveId: settings.driveId!, rootFolder: settings.rootFolder };
}
