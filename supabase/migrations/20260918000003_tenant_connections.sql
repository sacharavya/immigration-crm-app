-- ============================================================================
-- A firm connects its own Microsoft or Google account.
-- ============================================================================
--
-- One connection per firm powers two things that are currently shared and
-- should not be:
--
--   storage  every firm's client documents land in the platform's OneDrive,
--            because the Graph credentials are one app registration in env.
--   email    every firm's client receives mail from the platform's address,
--            because the Resend sender is a single env var.
--
-- After a firm connects, both run as that firm: files in their drive, mail
-- from their address. Consent is a normal user sign-in, so a practice with no
-- IT department can do it unaided; the trade is that the grant belongs to the
-- person who signed in, which is why the UI tells firms to use a shared
-- mailbox rather than a partner's personal account.
--
-- Refresh tokens are the crown jewels here: one is long-lived access to a
-- firm's entire mailbox and drive. They are encrypted by the application
-- before they arrive, and this table grants nothing to `authenticated` at
-- all — not even the firm's own staff can read their own ciphertext. Staff
-- see connection status through a function that returns metadata only.

CREATE TYPE crm.connection_provider AS ENUM ('microsoft', 'google');

CREATE TABLE crm.tenant_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES crm.tenants(id) ON DELETE CASCADE,
    provider crm.connection_provider NOT NULL,

    -- Which account consented. Shown to staff so they can tell whose
    -- mailbox the firm is sending from.
    account_email CITEXT NOT NULL,
    account_name TEXT,

    -- Ciphertext, never the raw token. See src/lib/connections/crypto.ts.
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT,
    expires_at TIMESTAMPTZ NOT NULL,

    -- What the grant actually covers, so the app can tell whether this
    -- connection may send mail as well as store files without guessing.
    scopes TEXT[] NOT NULL DEFAULT '{}',

    -- Where files go inside that account. Chosen after connecting.
    drive_id TEXT,
    root_folder_id TEXT,
    root_folder_path TEXT NOT NULL DEFAULT '',

    -- A refresh that fails (revoked consent, password change, licence
    -- removed) parks the connection here rather than retrying forever.
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'needs_reauth', 'revoked')),
    last_error TEXT,
    last_refreshed_at TIMESTAMPTZ,

    connected_by UUID REFERENCES crm.staff(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One connection per provider per firm. Reconnecting replaces it.
CREATE UNIQUE INDEX idx_tenant_connection_per_provider
    ON crm.tenant_connections (tenant_id, provider);

CREATE TRIGGER trg_updated_tenant_connections
    BEFORE UPDATE ON crm.tenant_connections
    FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

ALTER TABLE crm.tenant_connections ENABLE ROW LEVEL SECURITY;

-- Deliberately no policy for `authenticated`. RLS denies by default, so
-- staff cannot select this table at all, and the encrypted tokens are
-- unreachable from any session. Server code uses the service role.
CREATE POLICY service_role_tenant_connections
    ON crm.tenant_connections FOR ALL TO service_role USING (true);

GRANT ALL ON crm.tenant_connections TO service_role;

-- What staff are allowed to know: who is connected, for what, and whether it
-- still works. No tokens, and scoped to their own firm.
CREATE OR REPLACE FUNCTION crm.connection_status()
RETURNS TABLE (
    provider crm.connection_provider,
    account_email CITEXT,
    account_name TEXT,
    scopes TEXT[],
    can_store_files BOOLEAN,
    can_send_mail BOOLEAN,
    root_folder_path TEXT,
    status TEXT,
    last_error TEXT,
    connected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID := crm.current_tenant_id();
BEGIN
    IF v_tenant IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT c.provider,
           c.account_email,
           c.account_name,
           c.scopes,
           -- Matching on a fragment keeps this working when a provider
           -- returns the fully-qualified scope URI.
           EXISTS (SELECT 1 FROM unnest(c.scopes) s
                    WHERE s ILIKE '%files.readwrite%' OR s ILIKE '%drive%'),
           EXISTS (SELECT 1 FROM unnest(c.scopes) s
                    WHERE s ILIKE '%mail.send%' OR s ILIKE '%gmail.send%'),
           c.root_folder_path,
           c.status,
           c.last_error,
           c.created_at
      FROM crm.tenant_connections c
     WHERE c.tenant_id = v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION crm.connection_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.connection_status() TO authenticated, service_role;
