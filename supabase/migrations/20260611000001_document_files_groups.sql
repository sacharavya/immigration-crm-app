-- =========================================================================
-- File-level versioning invariant for the document checklist.
--
-- Every fresh upload starts a new file_group_key (uuid). Every re-upload to
-- a rejected file inherits the group key and increments version_number.
-- Each group has exactly one live row (max version); lower versions are
-- 'superseded'. Filenames display the version but are never the source of
-- truth.
--
-- Status enum is unchanged. Lifecycle mapping (informal, documented in the
-- column comment for future readers):
--   'requested'    slot exists, no file yet
--   'uploaded'     awaiting review (spec name: awaiting_review)
--   'under_review' legacy; same meaning as 'uploaded'; no new writers
--   'accepted'     approved (spec name: approved)
--   'rejected'     rejected
--   'superseded'   replaced by a higher-version row in the same group
-- =========================================================================

-- 1. Add the column. No DEFAULT yet; backfill needs full control over which
--    value each existing row gets.
ALTER TABLE files.documents
    ADD COLUMN file_group_key UUID;

-- 2. Backfill: assign one file_group_key per existing version chain.
--
-- A "chain" is a connected component reachable via the supersedes self-FK.
-- The supersedes column points from a newer row to the older row it
-- replaces, so the chain tip is a row that no other row supersedes. The
-- recursive CTE anchors on those tips and walks UP the chain via
-- parent.id = cur.supersedes, enumerating every member of every chain.
WITH RECURSIVE chains AS (
    -- Anchors: chain tips (latest version of each group). A tip is a row
    -- that no other row supersedes.
    SELECT d.id AS chain_root, d.id AS member_id
      FROM files.documents d
     WHERE NOT EXISTS (
         SELECT 1 FROM files.documents x WHERE x.supersedes = d.id
     )
    UNION ALL
    -- Recursion: from the current member, hop to the row IT supersedes
    -- (the older version). cur.supersedes = parent.id advances the walk
    -- one step toward the chain root.
    SELECT c.chain_root, parent.id
      FROM chains c
      JOIN files.documents cur    ON cur.id = c.member_id
      JOIN files.documents parent ON parent.id = cur.supersedes
),
keys_per_chain AS (
    -- One fresh UUID per distinct chain root.
    SELECT chain_root, gen_random_uuid() AS file_group_key
      FROM (SELECT DISTINCT chain_root FROM chains) z
)
UPDATE files.documents d
   SET file_group_key = k.file_group_key
  FROM chains c
  JOIN keys_per_chain k ON k.chain_root = c.chain_root
 WHERE d.id = c.member_id
   AND d.file_group_key IS NULL;

-- 3. Orphan sweep. Any rows the recursion didn't touch (singletons whose
--    only history is themselves but were never reached because of
--    soft-delete-only state, or future edge cases): assign a fresh UUID
--    each.
UPDATE files.documents
   SET file_group_key = gen_random_uuid()
 WHERE file_group_key IS NULL;

-- 4. Lock the column in. The DEFAULT ensures non-checklist writers
--    (retainer PDFs, payment proofs, future code paths) get a fresh group
--    key automatically without code changes. No trigger needed.
ALTER TABLE files.documents
    ALTER COLUMN file_group_key SET NOT NULL,
    ALTER COLUMN file_group_key SET DEFAULT gen_random_uuid();

-- 5. Lookup index for the group_key column.
CREATE INDEX idx_documents_file_group_key
    ON files.documents (file_group_key);

-- 6. The live-row invariant: one live row per group.
--
-- "Live" = could be the current head of the chain = not superseded and
-- not soft-deleted. The 'rejected' status is intentionally live: it holds
-- the slot until a replacement upload arrives.
--
-- IMPORTANT for callers: this index is checked per statement, not at
-- commit. A re-upload MUST flip the prior row to 'superseded' BEFORE
-- inserting the new version, or the INSERT will violate this index inside
-- a single transaction. The reupload action in Increment 2 uses
-- UPDATE...RETURNING to do the flip and capture the version in one
-- statement, then INSERTs version_number + 1. The statement order cannot
-- be reversed.
CREATE UNIQUE INDEX uniq_document_live_per_group
    ON files.documents (file_group_key)
    WHERE status NOT IN ('superseded') AND deleted_at IS NULL;

-- 7. Documentation for future readers.
COMMENT ON COLUMN files.documents.file_group_key IS
    'Stable identity across versions. Re-uploads to a rejected file '
    'inherit this key with version_number += 1. Fresh uploads (including '
    'siblings on a multi-file item) get a fresh key via DEFAULT '
    'gen_random_uuid(). The partial unique index '
    'uniq_document_live_per_group enforces one live row per group; '
    'callers must flip prior to "superseded" before inserting the new '
    'version. See migration 20260611000001 for lifecycle mapping.';
