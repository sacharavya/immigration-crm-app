-- ============================================================================
-- Index + constraint cleanup
--
-- Follow-up to a full schema review. Three independent, low-risk changes:
--   M7  Add missing hot-path FK / lookup indexes (currently seq-scan on join).
--   M4  Consolidate the retainer signing-token uniqueness onto a single
--       partial UNIQUE index (the inline column UNIQUE + a separate non-unique
--       partial index were overlapping; after backfill the column is mostly
--       NULL, so the partial index is the one we actually want).
--   M6  Drop two dead trigram indexes left behind when NOC search moved from
--       trigram similarity to tsvector FTS — the final search_noc() no longer
--       references similarity() on example_titles_flat or duties_flat.
--
-- All tables here are small (single-tenant CRM), so plain CREATE INDEX is fine;
-- no CONCURRENTLY needed (and Supabase wraps each migration in a transaction,
-- which CONCURRENTLY cannot run inside).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- M7 — missing FK / lookup indexes
-- ---------------------------------------------------------------------------

-- Joined on every case load; only service_type_id was indexed.
CREATE INDEX IF NOT EXISTS idx_cases_service_template
    ON crm.cases (service_template_id);

-- "Which cases is this client a participant in" — the UNIQUE(case_id, client_id)
-- only serves case_id-leading lookups, not client_id alone.
CREATE INDEX IF NOT EXISTS idx_case_participants_client
    ON crm.case_participants (client_id);

-- Serves the doc-gate EXISTS subqueries (can_advance_phase) and the
-- DISTINCT ON (case_id, document_code) ORDER BY ... created_at DESC in
-- v_case_chip_inputs in one composite, partial index.
CREATE INDEX IF NOT EXISTS idx_documents_case_code
    ON files.documents (case_id, document_code, created_at DESC)
    WHERE deleted_at IS NULL;

-- Paralegal "my cases" filtering.
CREATE INDEX IF NOT EXISTS idx_cases_assigned_paralegal
    ON crm.cases (assigned_paralegal)
    WHERE assigned_paralegal IS NOT NULL;

-- Self-referential supersession chain walks.
CREATE INDEX IF NOT EXISTS idx_documents_supersedes
    ON files.documents (supersedes)
    WHERE supersedes IS NOT NULL;

-- Self-referential correction chain walks.
CREATE INDEX IF NOT EXISTS idx_case_events_corrects
    ON crm.case_events (corrects_event)
    WHERE corrects_event IS NOT NULL;

-- Payment-to-invoice rollups.
CREATE INDEX IF NOT EXISTS idx_payments_invoice
    ON crm.payments (invoice_id)
    WHERE invoice_id IS NOT NULL;

-- Invoice-by-case lookups.
CREATE INDEX IF NOT EXISTS idx_invoices_case
    ON crm.invoices (case_id)
    WHERE case_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- M4 — consolidate retainer signing-token uniqueness
--
-- Before: a column-level UNIQUE (full B-tree, allows many NULLs) PLUS a
-- separate non-unique partial index idx_retainer_token. Token uniqueness rode
-- entirely on the column constraint. Collapse to a single partial UNIQUE index
-- on the live, non-null tokens. (No duplicate non-null tokens can exist today
-- because the column UNIQUE has been enforcing it.)
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS crm.idx_retainer_token;

ALTER TABLE crm.retainer_agreements
    DROP CONSTRAINT IF EXISTS retainer_agreements_signing_token_key;

CREATE UNIQUE INDEX idx_retainer_token
    ON crm.retainer_agreements (signing_token)
    WHERE signing_token IS NOT NULL AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- M6 — drop dead trigram indexes (NOC search is FTS now)
--
-- idx_noc_title_trgm is kept: the final search_noc() still uses
-- similarity(n.title, ...). The other two are no longer referenced by any
-- query and only cost write throughput + storage.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS ref.idx_noc_example_titles_trgm;
DROP INDEX IF EXISTS ref.idx_noc_duties_trgm;
