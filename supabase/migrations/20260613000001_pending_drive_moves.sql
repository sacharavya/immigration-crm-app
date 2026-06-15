-- Increment 5: queue for OneDrive move operations that fail at the
-- moment of re-upload.
--
-- Why a queue at all: when a client (or staff) re-uploads a file that
-- staff previously rejected, the DB flips the prior row to
-- 'superseded' and inserts v(N+1) atomically. That is the source of
-- truth for the checklist UI. We ALSO want to move the rejected file
-- on disk into the case's "99 Rejected" folder so OneDrive browsing
-- mirrors the DB state. The move is best-effort — if it fails, the DB
-- is still consistent and the user is unblocked, but the rejected
-- file is left in the active category folder where it can confuse
-- staff who browse OneDrive directly.
--
-- The action enqueues a row here BEFORE attempting the inline move.
-- If the inline move succeeds the row gets `succeeded_at` stamped
-- immediately. If it fails, the row stays pending and the daily cron
-- (Increment 5's drive-moves sweep) retries with one attempt per day.
-- After `max_attempts` consecutive failures the row is marked
-- abandoned; manual intervention is required at that point.
--
-- Why not a trigger: the action layer already knows the target folder
-- name and the new file name, so encoding all that in SQL would
-- duplicate logic and require new RPC plumbing.

CREATE TABLE files.pending_drive_moves (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The file row whose Graph item id needs to be moved. References the
  -- post-flip 'superseded' row (NOT the new live row).
  document_id  UUID NOT NULL
    REFERENCES files.documents(id) ON DELETE CASCADE,
  -- Snapshotted from the document at enqueue time so a later rename or
  -- other write to the document row doesn't change what we're trying
  -- to do. Drive id + item id together identify the OneDrive object.
  source_drive_id  TEXT NOT NULL,
  source_item_id   TEXT NOT NULL,
  -- The case folder item id that owns the "99 Rejected" subfolder.
  -- The cron sweep doesn't re-query the case row — it trusts this.
  case_folder_item_id TEXT NOT NULL,
  -- Target filename inside Rejected/. Includes the date suffix so two
  -- rejections of the same document don't collide. Computed at
  -- enqueue.
  target_file_name TEXT NOT NULL,
  -- Status machine: pending -> succeeded | abandoned. The cron updates
  -- last_error/attempt_count/next_attempt_at on failure but only flips
  -- the status on terminal outcomes.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'abandoned')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  last_error    TEXT,
  -- next_attempt_at = NOW() at enqueue so the first cron tick picks it
  -- up; the action does an inline attempt first, which stamps
  -- succeeded_at and short-circuits the cron sweep entirely on the
  -- happy path. On failure the action bumps next_attempt_at to
  -- tomorrow so the cron starts retrying after one day.
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  succeeded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sweep query: cron grabs `pending` rows whose next_attempt_at <= NOW().
-- This is the only access pattern, so a single partial index is enough.
CREATE INDEX idx_pending_drive_moves_due
  ON files.pending_drive_moves (next_attempt_at)
  WHERE status = 'pending';

-- Optional reverse lookup: given a document, did we ever enqueue?
-- Useful for admin debugging, not a hot path.
CREATE INDEX idx_pending_drive_moves_document_id
  ON files.pending_drive_moves (document_id);

-- updated_at maintenance. Trigger function lives in crm; reuse it.
CREATE TRIGGER set_pending_drive_moves_updated_at
  BEFORE UPDATE ON files.pending_drive_moves
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- RLS: this table is only ever written by service-role code (the
-- reupload action + the cron). No staff-facing or portal-facing read
-- path is needed. Enable RLS with NO policies — denies all by default
-- except service_role (which bypasses RLS).
ALTER TABLE files.pending_drive_moves ENABLE ROW LEVEL SECURITY;
