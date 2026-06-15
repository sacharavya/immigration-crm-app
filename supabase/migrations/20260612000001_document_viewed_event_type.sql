-- =========================================================================
-- Add 'document_viewed' to the crm.event_type enum.
--
-- Used by the secure file-viewer proxy at /api/files/[fileId]/route.ts.
-- One row is inserted into crm.case_events per successful view, capturing
-- the document id, version, actor kind (staff vs portal), and mime type
-- served. The view audit is a CICC compliance requirement.
--
-- The insert lands in the same crm.case_events table other document
-- events use, so existing audit RLS + immutability apply unchanged
-- (case_events has no UPDATE/DELETE policies).
-- =========================================================================

ALTER TYPE crm.event_type ADD VALUE IF NOT EXISTS 'document_viewed';
