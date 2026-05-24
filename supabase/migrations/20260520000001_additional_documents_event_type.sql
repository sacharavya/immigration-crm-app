-- ============================================================================
-- FLOW-3d (1/3): add 'additional_documents_requested' event type.
--
-- Split into its own migration because ALTER TYPE ADD VALUE cannot be used
-- in the same transaction as DML that references the new value. Subsequent
-- FLOW-3d migrations (column changes, view rewire) can use it freely.
-- ============================================================================

ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'additional_documents_requested';
