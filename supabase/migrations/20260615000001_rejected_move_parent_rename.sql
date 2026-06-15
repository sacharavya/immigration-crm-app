-- Increment 5 refinement: the "99 Rejected" subfolder is now created
-- under the GROUP folder (e.g. "01 Identity/99 Rejected") rather than
-- under the case root. Staff browsing OneDrive want rejected files
-- co-located with their active siblings so the rejected file's
-- category context is preserved.
--
-- Rename the queue's case_folder_item_id column to the more general
-- parent_folder_item_id since the value is no longer always the case
-- folder. The data is forwards-compatible: any rows already enqueued
-- against the case folder will resolve to "99 Rejected" under the
-- case root (the prior semantics), which is non-destructive — staff
-- can hand-move those into the correct group folder afterward.
-- The queue is brand-new today so this is expected to be empty in
-- practice.

ALTER TABLE files.pending_drive_moves
  RENAME COLUMN case_folder_item_id TO parent_folder_item_id;
