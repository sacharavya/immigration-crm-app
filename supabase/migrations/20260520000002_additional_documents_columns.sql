-- ============================================================================
-- FLOW-3d (2/3): schema changes to support additional documents requested
-- by IRCC after submission.
--
--   crm.case_required_documents
--     • PK swap: drop (case_id, document_code) PK, add surrogate UUID id.
--       Multiple ad-hoc rows per case (one per requested document) need
--       distinct PKs; the old composite PK forced uniqueness on
--       document_code per case which doesn't work for ad-hoc docs whose
--       document_code is null.
--     • UNIQUE(case_id, document_code) is preserved as a normal constraint
--       so the existing setCaseDocumentRequired() upsert with
--       onConflict: "case_id,document_code" keeps working. Postgres treats
--       NULL document_code as distinct across rows, so ad-hoc rows can
--       coexist without conflict.
--     • New columns:
--         custom_label             — human name for ad-hoc docs (NULL for
--                                    template-backed Phase 2 docs).
--         due_date                 — optional, for IRCC-requested docs.
--         requested_at_event_id    — FK to crm.case_events; NULL = original
--                                    Phase 2, NOT NULL = added by an IRCC
--                                    additional-documents-requested event.
--     • Check: every row has either document_code OR custom_label.
--
--   files.documents.required_document_id
--     • New FK column: lets uploads link to a specific case_required_documents
--       row when there's no document_code to match on (i.e., ad-hoc docs).
--       Phase 2 uploads continue to use document_code; ad-hoc uploads set
--       required_document_id and leave document_code null.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. case_required_documents: surrogate UUID id, then PK swap.
-- ----------------------------------------------------------------------------
ALTER TABLE crm.case_required_documents
    ADD COLUMN IF NOT EXISTS id UUID NOT NULL DEFAULT gen_random_uuid();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'crm.case_required_documents'::regclass
           AND contype = 'p'
           AND conname = 'case_required_documents_pkey'
    ) AND NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = 'crm.case_required_documents'::regclass
           AND contype = 'p'
           AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
    ) THEN
        ALTER TABLE crm.case_required_documents
            DROP CONSTRAINT case_required_documents_pkey;
        ALTER TABLE crm.case_required_documents
            ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Re-add a unique constraint on (case_id, document_code) so existing upsert
-- patterns (onConflict: "case_id,document_code") in setCaseDocumentRequired
-- keep working. NULL document_code is treated as distinct across rows in
-- normal UNIQUE — exactly what we need.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.case_required_documents'::regclass
           AND conname = 'crd_case_doc_code_uniq'
    ) THEN
        ALTER TABLE crm.case_required_documents
            ADD CONSTRAINT crd_case_doc_code_uniq UNIQUE (case_id, document_code);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Nullable document_code + new columns + check.
-- ----------------------------------------------------------------------------
ALTER TABLE crm.case_required_documents
    ALTER COLUMN document_code DROP NOT NULL;

ALTER TABLE crm.case_required_documents
    ADD COLUMN IF NOT EXISTS custom_label TEXT,
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS requested_at_event_id UUID
        REFERENCES crm.case_events(id);

COMMENT ON COLUMN crm.case_required_documents.custom_label IS
    'Free-text label for ad-hoc IRCC-requested docs (where document_code is NULL).';
COMMENT ON COLUMN crm.case_required_documents.due_date IS
    'Optional due date, primarily for IRCC-requested additional documents.';
COMMENT ON COLUMN crm.case_required_documents.requested_at_event_id IS
    'NULL for original Phase 2. NOT NULL = added by an additional_documents_requested event.';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.case_required_documents'::regclass
           AND conname = 'crd_has_identifier'
    ) THEN
        ALTER TABLE crm.case_required_documents
            ADD CONSTRAINT crd_has_identifier
                CHECK (document_code IS NOT NULL OR custom_label IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crd_requested_at_event
    ON crm.case_required_documents(requested_at_event_id)
    WHERE requested_at_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. files.documents.required_document_id — FK to case_required_documents.id.
-- ----------------------------------------------------------------------------
ALTER TABLE files.documents
    ADD COLUMN IF NOT EXISTS required_document_id UUID
        REFERENCES crm.case_required_documents(id);

COMMENT ON COLUMN files.documents.required_document_id IS
    'Optional FK to the crm.case_required_documents row this upload satisfies. Used for ad-hoc IRCC-requested docs where document_code is NULL.';

CREATE INDEX IF NOT EXISTS idx_documents_required_doc
    ON files.documents(required_document_id)
    WHERE required_document_id IS NOT NULL;
