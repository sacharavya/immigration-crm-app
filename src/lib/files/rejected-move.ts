import { adminClient } from "@/lib/supabase/admin";

import { ensureRejectedFolderUnder } from "@/lib/graph/folders";
import {
  composeRejectedFileName,
  moveAndRenameDriveItem,
} from "@/lib/graph/move";


// Increment 5: invoked at the end of a successful re-upload to move
// the just-superseded OneDrive item into the case's "99 Rejected"
// folder. The DB is already consistent at this point (the rejected
// row is flipped to 'superseded' and the new v(N+1) is inserted); the
// move only affects what staff sees when browsing OneDrive directly.
//
// Failure modes (network blip, Graph 5xx, ensureFolder race) are
// non-fatal: we enqueue a pending_drive_moves row first, attempt the
// move inline, and on success stamp succeeded_at. On failure the row
// stays pending with next_attempt_at = tomorrow and the daily
// drive-moves cron picks it up.
//
// We pass the post-flip superseded row's drive id + item id + file
// name. The caller already has these — passing them in avoids an
// extra DB read and lets this helper run with a service-role admin
// client without touching the staff session.

export type EnqueueRejectedMoveInput = {
  // The 'superseded' (post-flip) document row. This is the row whose
  // Graph item we're moving; the new v(N+1) row stays in the active
  // category folder.
  supersededDocumentId: string;
  sourceDriveId: string;
  sourceItemId: string;
  sourceFileName: string;
  // The folder under which "99 Rejected/" should be created. Callers
  // pass the GROUP folder (e.g. "01 Identity") so rejected files stay
  // co-located with their active siblings; passing the case folder
  // also works if a case-wide bucket is preferred. The cron trusts
  // this value verbatim — no relookup.
  parentFolderItemId: string;
};

export async function enqueueAndAttemptRejectedMove(
  input: EnqueueRejectedMoveInput,
): Promise<void> {
  const admin = adminClient();
  const now = new Date();
  const targetFileName = composeRejectedFileName(
    input.sourceFileName,
    now.toISOString(),
    input.supersededDocumentId,
  );

  // 1. Enqueue first. If this insert fails we can't safely run the
  //    inline move (we'd have no retry safety net), so we log + skip.
  const { data: queueRow, error: insertErr } = await admin
    .schema("files")
    .from("pending_drive_moves")
    .insert({
      document_id: input.supersededDocumentId,
      source_drive_id: input.sourceDriveId,
      source_item_id: input.sourceItemId,
      parent_folder_item_id: input.parentFolderItemId,
      target_file_name: targetFileName,
    })
    .select("id")
    .single();
  if (insertErr || !queueRow) {
    console.warn(
      "[rejected-move] could not enqueue, skipping inline attempt:",
      insertErr?.message,
    );
    return;
  }

  // 2. Inline best-effort move. The cron handles retries on failure;
  //    on success we stamp succeeded_at so the cron skips this row.
  try {
    const { folderItemId } = await ensureRejectedFolderUnder(
      input.parentFolderItemId,
    );
    await moveAndRenameDriveItem(
      input.sourceDriveId,
      input.sourceItemId,
      folderItemId,
      targetFileName,
    );
    await admin
      .schema("files")
      .from("pending_drive_moves")
      .update({
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        attempt_count: 1,
      })
      .eq("id", queueRow.id);
  } catch (err) {
    // Bump next_attempt_at to ~24h out so the daily cron sweeps it.
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .schema("files")
      .from("pending_drive_moves")
      .update({
        attempt_count: 1,
        last_error: message.slice(0, 500),
        next_attempt_at: tomorrow.toISOString(),
      })
      .eq("id", queueRow.id);
    console.warn(
      "[rejected-move] inline attempt failed, queued for retry:",
      message,
    );
  }
}
