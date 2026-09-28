-- ============================================================================
-- Staged uploads: files go browser → storage, not through the app server.
-- ============================================================================
--
-- A server action's request body is capped at 4.5 MB by the hosting platform,
-- which rejected multipage scans before any code ran. The browser now uploads
-- straight into this private bucket with a one-time signed URL minted by the
-- server; the action then receives only the object's path, reads it back with
-- the service role, forwards it to the firm's drive, and deletes it.
--
-- No policies on purpose: anon and authenticated roles have no access. Signed
-- upload URLs are honoured by the storage service without RLS, and the read
-- and delete happen as the service role.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('uploads', 'uploads', FALSE, 10 * 1024 * 1024)
ON CONFLICT (id) DO NOTHING;
