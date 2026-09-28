-- ============================================================================
-- The platform's object store is the default document storage.
-- ============================================================================
--
-- A firm that connects Microsoft 365 or Google Workspace keeps its documents
-- in its own drive; a firm that names a OneDrive library keeps using it.
-- Everyone else — including every new firm — uploads to the platform's R2
-- bucket from day one, with nothing to configure.
--
-- Rows that still say 'onedrive' but never named a library were only ever
-- served by the deployment-wide GRAPH_DOCUMENT_LIBRARY_ID fallback; they
-- move to the default too.

ALTER TABLE crm.storage_settings ALTER COLUMN provider SET DEFAULT 'r2';

UPDATE crm.storage_settings
   SET provider = 'r2'
 WHERE provider = 'onedrive'
   AND drive_id IS NULL;
