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
// with no real damage. The retry loop in the cron handler treats any
// 4xx as terminal (no retry) and any 5xx/network as retryable.

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

// Decorates the source filename with a date suffix so two rejections
// of the same document don't collide in the "99 Rejected" folder.
//   bbi_e1_birth_certificate.pdf  ->  bbi_e1_birth_certificate__rejected_2026-06-13.pdf
// The double underscore is a marker that staff can grep for.
export function composeRejectedFileName(
  originalName: string,
  rejectedOnIsoDate: string,
): string {
  const dot = originalName.lastIndexOf(".");
  const ymd = rejectedOnIsoDate.slice(0, 10);
  if (dot <= 0) return `${originalName}__rejected_${ymd}`;
  const base = originalName.slice(0, dot);
  const ext = originalName.slice(dot);
  return `${base}__rejected_${ymd}${ext}`;
}
