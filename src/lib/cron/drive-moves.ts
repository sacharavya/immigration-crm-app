import { createClient as createServiceClient } from "@supabase/supabase-js";

import { ensureCaseRejectedFolder } from "@/lib/graph/folders";
import { moveAndRenameDriveItem } from "@/lib/graph/move";
import type { Database } from "@/lib/supabase/types";

// Increment 5: daily sweep of files.pending_drive_moves. Re-uploads
// enqueue a row here and attempt the OneDrive move inline. If the
// inline attempt fails, the row stays `pending` with
// next_attempt_at = tomorrow. This sweep grabs everything due, tries
// each one, and either flips to `succeeded` or bumps the attempt
// counter (with another +24h backoff). After max_attempts (default 5)
// the row is abandoned and manual intervention is required.
//
// One row per call is processed sequentially to keep the Graph
// request rate predictable. The cron tick is daily so this is at
// most ~N moves per day where N is the size of the queue; that's a
// rounding error compared to interactive Graph load.

export type DriveMovesSweepResult = {
  processed: number;
  succeeded: number;
  failed: number;
  abandoned: number;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function runDriveMovesSweep(): Promise<DriveMovesSweepResult> {
  const supabase = adminClient();
  const nowIso = new Date().toISOString();

  // Pull all pending rows that are due. The partial index
  // idx_pending_drive_moves_due covers this query directly. Limit at
  // a high but bounded value so a runaway backfill doesn't blow past
  // Vercel's per-invocation budget.
  const { data: due, error } = await supabase
    .schema("files")
    .from("pending_drive_moves")
    .select(
      "id, source_drive_id, source_item_id, case_folder_item_id, target_file_name, attempt_count, max_attempts",
    )
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[cron.drive-moves] query failed", error);
    throw new Error("query_failed");
  }

  const summary: DriveMovesSweepResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    abandoned: 0,
  };

  for (const row of due ?? []) {
    summary.processed++;
    const nextAttempt = row.attempt_count + 1;
    try {
      const { folderItemId } = await ensureCaseRejectedFolder(
        row.case_folder_item_id,
      );
      await moveAndRenameDriveItem(
        row.source_drive_id,
        row.source_item_id,
        folderItemId,
        row.target_file_name,
      );
      await supabase
        .schema("files")
        .from("pending_drive_moves")
        .update({
          status: "succeeded",
          succeeded_at: new Date().toISOString(),
          attempt_count: nextAttempt,
          last_error: null,
        })
        .eq("id", row.id);
      summary.succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isTerminal = nextAttempt >= row.max_attempts;
      const nextDue = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await supabase
        .schema("files")
        .from("pending_drive_moves")
        .update({
          attempt_count: nextAttempt,
          last_error: message.slice(0, 500),
          status: isTerminal ? "abandoned" : "pending",
          next_attempt_at: nextDue.toISOString(),
        })
        .eq("id", row.id);
      if (isTerminal) {
        summary.abandoned++;
        console.error(
          "[cron.drive-moves] ABANDONED after max attempts",
          row.id,
          message,
        );
      } else {
        summary.failed++;
        console.warn(
          "[cron.drive-moves] move failed, will retry",
          row.id,
          message,
        );
      }
    }
  }

  return summary;
}
