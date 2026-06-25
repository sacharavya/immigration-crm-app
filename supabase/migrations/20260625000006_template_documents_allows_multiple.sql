-- ----------------------------------------------------------------------------
-- Per-document "multiple files" flag on checklist templates.
--
-- Replaces the deprecated expected_quantity gate (kept default 1, no UI, no
-- behaviour) with an explicit boolean the checklist editor exposes as a
-- "Multiple files" checkbox. A requirement is single-file by default; checking
-- the box lets the case checklist accept several files for that one slot and
-- show the "Add another" affordance.
--
-- ADDITIVE + BACKWARD-COMPATIBLE: old app code ignores this column, so the
-- migration is safe to apply to a database ahead of the code that reads it.
-- Always apply DB migrations BEFORE deploying the matching app code. The app
-- also reads this column tolerantly (falls back to expected_quantity) so a
-- deploy-before-migrate window cannot blank the checklist.
--
-- expected_quantity is left in place for backwards compatibility but is no
-- longer read for the single/multi decision. Backfill: any template that
-- previously expected more than one file becomes allows_multiple = true.
-- ----------------------------------------------------------------------------

ALTER TABLE ref.template_documents
    ADD COLUMN IF NOT EXISTS allows_multiple BOOLEAN NOT NULL DEFAULT false;

UPDATE ref.template_documents
   SET allows_multiple = true
 WHERE expected_quantity > 1;
