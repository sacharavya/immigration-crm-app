-- =========================================================================
-- Client intake-form portal token.
--
-- Lets staff send a single-link to a client so they can fill the intake
-- form themselves (per-client surface, mirroring the per-case upload
-- portal at crm.cases.client_portal_token / /upload/<token>).
--
-- Three columns on crm.clients:
--   intake_portal_token            UUID, unique, nullable
--     The token in the share URL: /intake/<token>. NULL = no active link
--     (link was never generated, or revoked). Staff regenerate by
--     overwriting; revoke by SET NULL.
--
--   intake_portal_token_created_at TIMESTAMPTZ
--     Stamped at generation time. Read by the staff UI to show
--     "Link issued <date>" and by future expiry policy if we add one.
--     We deliberately do NOT auto-expire — the submit-lock below is
--     the durable "this form is done" signal.
--
--   intake_submitted_at            TIMESTAMPTZ
--     Set when the client clicks Submit on the public form. While set,
--     the public route accepts NO writes — the form is read-only on
--     the client side, and the gate fn rejects mutations.
--     Staff reopen by clearing this column (UI: "Request changes").
--
-- Security model:
--   - Token validation runs server-side on every action via a
--     service-role admin client (auth.uid() is null on the public
--     route, so RLS cannot be the gate). The action checks:
--       1. token matches a non-deleted client row
--       2. intake_submitted_at IS NULL
--       3. the action's clientId argument matches the row resolved
--          from the token (prevents the client tampering with the
--          form's hidden clientId field).
--   - RLS on crm.clients still locks writes to staff with edit_clients.
--     The public actions intentionally use service-role and trust the
--     above checks — there is no RLS path for portal writes by design.
-- =========================================================================

ALTER TABLE crm.clients
  ADD COLUMN intake_portal_token UUID UNIQUE,
  ADD COLUMN intake_portal_token_created_at TIMESTAMPTZ,
  ADD COLUMN intake_submitted_at TIMESTAMPTZ;

CREATE INDEX idx_clients_intake_portal_token
  ON crm.clients(intake_portal_token)
  WHERE intake_portal_token IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN crm.clients.intake_portal_token IS
  'UUID token for the public client-self-serve intake at /intake/<token>. Staff rotate by overwriting, revoke by SET NULL. Submit-lock is intake_submitted_at, not token expiry.';

COMMENT ON COLUMN crm.clients.intake_portal_token_created_at IS
  'Timestamp the current intake_portal_token was issued. Cleared (SET NULL) when the token is revoked.';

COMMENT ON COLUMN crm.clients.intake_submitted_at IS
  'When set, the public intake form is locked: portal actions refuse writes and the form renders read-only. Staff clear this column to reopen the form for changes.';
