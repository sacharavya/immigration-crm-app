import { createClient } from "@/lib/supabase/client";

import type { StagedUpload, UploadTarget } from "./types";

/**
 * Puts a file in the staging bucket from the browser and returns the handle
 * the server action needs. The bytes never pass through the app server, so
 * the platform's 4.5 MB request cap does not apply; the bucket's own limit
 * (10 MB) is the ceiling.
 *
 * `mint` is the server action that authorises the upload — it checks the
 * portal token or the staff session, then issues a one-time signed URL.
 */
export async function stageFile(
  file: File,
  mint: () => Promise<UploadTarget>,
): Promise<StagedUpload | { error: string }> {
  const target = await mint();
  if ("error" in target) return target;

  const { error } = await createClient()
    .storage.from("uploads")
    .uploadToSignedUrl(target.path, target.token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (error) {
    return {
      error: /exceed|too large|maximum size/i.test(error.message)
        ? "File exceeds the 10 MB limit."
        : `Upload failed: ${error.message}`,
    };
  }
  return { path: target.path, name: file.name, type: file.type, size: file.size };
}
