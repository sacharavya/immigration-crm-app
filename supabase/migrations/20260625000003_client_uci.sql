-- ============================================================================
-- Client-level UCI (Unique Client Identifier).
--
-- A UCI is IRCC's lifelong, per-person identifier: assigned once and reused
-- across every application the person ever files. It therefore belongs on the
-- client, not the case. Cases keep crm.cases.ircc_application_number (genuinely
-- per-application) and the legacy crm.cases.ircc_uci stays in place as a
-- fallback the app reads through during the transition.
--
-- All changes are additive and backward compatible: the new column defaults to
-- NULL and is backfilled from any case that already recorded a UCI.
-- ============================================================================

ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS uci TEXT;

COMMENT ON COLUMN crm.clients.uci IS
    'IRCC Unique Client Identifier. Per-person and lifelong, reused across all '
    'of the client''s cases. Recorded in the immigration status editor and on '
    'the client record. Cases keep ircc_application_number for the per-'
    'application number.';

-- Backfill from the most recently opened case that recorded a UCI, for clients
-- that do not already have one. Empty strings are ignored.
UPDATE crm.clients c
SET uci = sub.ircc_uci
FROM (
    SELECT DISTINCT ON (client_id)
        client_id,
        ircc_uci
    FROM crm.cases
    WHERE ircc_uci IS NOT NULL
      AND btrim(ircc_uci) <> ''
      AND deleted_at IS NULL
    ORDER BY client_id, opened_at DESC
) sub
WHERE c.id = sub.client_id
  AND (c.uci IS NULL OR btrim(c.uci) = '');

-- Lookup parity with crm.cases(ircc_application_number): staff search clients
-- by UCI. Partial to skip the many NULL rows.
CREATE INDEX IF NOT EXISTS idx_clients_uci
    ON crm.clients (uci)
    WHERE uci IS NOT NULL AND deleted_at IS NULL;
