import { graphFetch } from "./client";

// Increment 5: moves + renames an existing drive item in a single
// Graph PATCH. Used to relocate a rejected file into the case's
// "99 Rejected" subfolder once the re-upload of v(N+1) has succeeded.
//
// Graph supports both rename and move via the same endpoint:
//   PATCH /drives/{driveId}/items/{itemId}
//   { "name": "...", "parentReference": { "id": "..." } }
//
// The call is idempotent at the per-target-name level: if a previous
// attempt already moved the file and a second attempt fires (e.g.
// inline succeeded, then the cron also tries because we forgot to
// stamp succeeded_at), Graph rejects the rename-into-same-location
// with a 409 nameAlreadyExists, which the cron then counts as a
// failed attempt. The current cron does NOT distinguish 4xx vs 5xx —
// every exception increments attempt_count and reschedules
// next_attempt_at by +24h until max_attempts is hit. Worth revisiting
// if we see legitimate 4xx (e.g. itemNotFound) burning the retry
// budget in practice.

export type MoveAndRenameResult = {
  itemId: string;
  webUrl: string;
  name: string;
};

export async function moveAndRenameDriveItem(
  driveId: string,
  itemId: string,
  targetParentItemId: string,
  newName: string,
): Promise<MoveAndRenameResult> {
  const updated = await graphFetch<{
    id: string;
    name: string;
    webUrl: string;
  }>(`/drives/${driveId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: newName,
      parentReference: { id: targetParentItemId },
    }),
  });
  return {
    itemId: updated.id,
    webUrl: updated.webUrl,
    name: updated.name,
  };
}

// Decorates the source filename with a date + short id suffix so two
// rejections in the same group folder on the same day don't collide.
//   bbi_e1_birth_certificate.pdf
//     -> bbi_e1_birth_certificate__rejected_2026-06-13_4f8a2b1c.pdf
// The double underscore is a marker that staff can grep for. The id
// tail is the leading 8 chars of the superseded document's UUID,
// which is unique per file_group_key + version. Date alone isn't
// enough — when expected_quantity > 1, two siblings can share a
// filename and be rejected the same day; the id tail fixes that.
export function composeRejectedFileName(
  originalName: string,
  rejectedOnIsoDate: string,
  uniqueId: string,
): string {
  const dot = originalName.lastIndexOf(".");
  const ymd = rejectedOnIsoDate.slice(0, 10);
  const tail = uniqueId.replace(/-/g, "").slice(0, 8);
  if (dot <= 0) return `${originalName}__rejected_${ymd}_${tail}`;
  const base = originalName.slice(0, dot);
  const ext = originalName.slice(dot);
  return `${base}__rejected_${ymd}_${tail}${ext}`;
}
