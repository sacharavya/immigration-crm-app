-- The app's schemas exist from the first second, so PostgREST loads its
-- schema cache (and reports healthy) before the migrations fill them. Every
-- migration uses CREATE SCHEMA IF NOT EXISTS, so this is harmless to them.
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS portal;
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS audit;
GRANT USAGE ON SCHEMA crm, files, portal, ref, platform, audit TO anon, authenticated, service_role;
