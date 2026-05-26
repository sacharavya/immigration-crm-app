-- ============================================================================
-- Education: add `level` to client_education_history.
--
-- The old "Years of study" block on the intake form (years_elementary,
-- years_secondary, years_post_secondary, years_trade_other on
-- crm.clients) was redundant — staff also entered institutions with
-- date_from/date_to. Going forward each education row carries its own
-- level, and the years-per-level are computed from the row's date range.
--
-- The legacy crm.clients.years_* columns are NOT dropped here — they
-- remain in the table so historical data is preserved. The intake UI
-- simply stops reading/writing them; completeness.ts switches to
-- checking row presence + level.
-- ============================================================================

ALTER TABLE crm.client_education_history
    ADD COLUMN IF NOT EXISTS level TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.client_education_history'::regclass
           AND conname = 'client_education_history_level_check'
    ) THEN
        ALTER TABLE crm.client_education_history
            ADD CONSTRAINT client_education_history_level_check
                CHECK (
                    level IS NULL
                    OR level IN (
                        'elementary',
                        'secondary',
                        'post_secondary',
                        'trade_other'
                    )
                );
    END IF;
END $$;

COMMENT ON COLUMN crm.client_education_history.level IS
    'Level of study for this entry. NULL on legacy rows; UI prompts staff to set it. Years per level are computed from date_from/date_to across rows.';
