-- ============================================================================
-- Location-driven immigration status.
--
-- Immigration status only exists relative to Canada, so the case header and
-- clients worklist now drive the field off a location flag plus a richer set
-- of in-Canada states (maintained status, restoration period, temporary
-- resident permit). All changes here are additive and backward compatible:
--   * Existing rows keep their immigration_status / expiry / note untouched.
--   * immigration_in_canada defaults to NULL, which the app treats as
--     "in Canada" (the model is Canada-centric), so no backfill is required.
--
-- ALTER TYPE ADD VALUE is allowed inside a transaction since Postgres 12. The
-- new values are NOT used elsewhere in this migration, so there is no
-- same-transaction-use restriction to worry about.
-- ============================================================================

ALTER TYPE crm.immigration_status_type ADD VALUE IF NOT EXISTS 'trp';
ALTER TYPE crm.immigration_status_type ADD VALUE IF NOT EXISTS 'maintained_status';
ALTER TYPE crm.immigration_status_type ADD VALUE IF NOT EXISTS 'restoration';

ALTER TABLE crm.clients
    ADD COLUMN IF NOT EXISTS immigration_in_canada BOOLEAN;

COMMENT ON COLUMN crm.clients.immigration_in_canada IS
    'Whether the client is currently in Canada. TRUE = in Canada, FALSE = '
    'outside Canada, NULL = not recorded (treated as in Canada by the app). '
    'Drives which immigration fields apply: expiry is meaningless outside '
    'Canada.';
