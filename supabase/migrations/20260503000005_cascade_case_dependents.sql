-- ============================================================================
-- Cascade case-history tables when a case is hard-deleted.
--
-- Background: PERM-1 added super_user-only hard delete on crm.cases, but
-- the FKs from crm.case_events and crm.communications back to crm.cases
-- were created without ON DELETE CASCADE in the initial schema. So a
-- delete request fails with FK constraint errors on cases that have any
-- history.
--
-- Tables that already cascade with the case:
--   - crm.case_participants     (initial schema)
--   - crm.tasks                 (initial schema)
--   - files.documents           (initial schema)
--   - crm.retainer_agreements   (RET-1)
--
-- Tables we now cascade with the case (history is meaningless without
-- its case, and the audit log captures the deletion event):
--   - crm.case_events
--   - crm.communications
--
-- Tables we deliberately leave without CASCADE (financial / regulatory
-- records — staff must void or move them before deleting the case):
--   - crm.invoices
--   - crm.payments
--
-- The deleteCase server action will refuse if invoices/payments exist
-- so staff get a clear message instead of an FK error.
-- ============================================================================

ALTER TABLE crm.case_events
    DROP CONSTRAINT IF EXISTS case_events_case_id_fkey;
ALTER TABLE crm.case_events
    ADD CONSTRAINT case_events_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES crm.cases(id) ON DELETE CASCADE;

ALTER TABLE crm.communications
    DROP CONSTRAINT IF EXISTS communications_case_id_fkey;
ALTER TABLE crm.communications
    ADD CONSTRAINT communications_case_id_fkey
    FOREIGN KEY (case_id) REFERENCES crm.cases(id) ON DELETE CASCADE;
