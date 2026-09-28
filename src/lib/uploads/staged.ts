import "server-only";

import { randomUUID } from "node:crypto";

import { adminClient } from "@/lib/supabase/admin";

import type { StagedUpload } from "./types";

const BUCKET = "uploads";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATH_RE = new RegExp(`^${UUID}/${UUID}$`, "i");

/**
 * Authorises one upload: a one-time signed URL for a fresh object under the
 * caller's firm. The caller has already verified who is asking.
 */
export async function mintStagedUpload(tenantId: string) {
  const path = `${tenantId}/${randomUUID()}`;
  const { data, error } = await adminClient()
    .storage.from(BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Could not authorise upload: ${error?.message ?? "no token"}`);
  }
  return { path, token: data.token };
}

/**
 * Reads a staged file back for processing and removes it from staging.
 * `tenantId` must match the path's first segment: a caller can only take
 * what was staged for its own firm.
 */
export async function takeStagedFile(
  staged: StagedUpload,
  tenantId: string | null | undefined,
): Promise<File | null> {
  if (!tenantId || !PATH_RE.test(staged.path) || !staged.path.startsWith(`${tenantId}/`)) {
    return null;
  }
  const storage = adminClient().storage.from(BUCKET);
  const { data, error } = await storage.download(staged.path);
  if (error || !data) return null;
  // Best effort: an orphan in staging is harmless; a failed action must not
  // lose the file it already took.
  void storage.remove([staged.path]);
  return new File([data], staged.name || "upload", {
    type: staged.type || data.type || "application/octet-stream",
  });
}
