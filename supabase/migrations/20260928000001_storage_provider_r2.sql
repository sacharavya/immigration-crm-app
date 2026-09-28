-- R2 (the platform's own object store) joins the storage providers. Adding
-- an enum value cannot share a transaction with statements that use it, so
-- the default and the backfill are in the next migration.
ALTER TYPE crm.storage_provider ADD VALUE IF NOT EXISTS 'r2';
