-- ============================================================================
-- SOWP (Spousal Open Work Permit) eligibility data.
--
-- Adds a data-driven flag to each NOC occupation indicating whether the
-- occupation is on IRCC's published list of TEER 2/3 occupations eligible
-- for the spousal OWP standard stream (effective Jan 21, 2025).
--
-- TEER 0/1 are always eligible regardless of this flag.
-- TEER 4/5 are never eligible under the standard stream.
-- TEER 2/3 are eligible only when sowp_listed = TRUE.
-- ============================================================================

-- 1. Add sowp_listed column
ALTER TABLE ref.noc_occupations
    ADD COLUMN IF NOT EXISTS sowp_listed BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Version tracking singleton
CREATE TABLE IF NOT EXISTS ref.sowp_list_version (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    version_label   TEXT NOT NULL,
    last_verified   DATE NOT NULL,
    source_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ref.sowp_list_version (version_label, last_verified, source_url)
VALUES (
    'IRCC SOWP eligible occupations, standard stream',
    '2026-06-23',
    'https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada/special-instructions/spouses-dependent-children/eligibility.html'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Backfill sowp_listed for IRCC-eligible TEER 2/3 occupations.
--
-- Eligible groups (verified against IRCC published list, June 2026):
--   TEER 2: 22xxx (natural/applied sciences), 32xxx (health),
--           72xxx (trades/transport), 82xxx (natural resources)
--   TEER 3: 33xxx (health support), 73xxx (general trades),
--           83xxx (natural resources/production)
--   Specific: 42102, 42202 (armed forces, ECE),
--             43100, 43204 (teacher assistants, armed forces operations),
--             53200, 53201 (athletes, coaches)
--
-- NOT eligible (explicitly excluded by IRCC):
--   12xxx, 13xxx (business/admin), 62xxx, 63xxx (sales/service),
--   92xxx, 93xxx (manufacturing)

UPDATE ref.noc_occupations SET sowp_listed = TRUE
WHERE teer IN (2, 3)
  AND (
    code LIKE '22%'
    OR code LIKE '32%'
    OR code LIKE '72%'
    OR code LIKE '82%'
    OR code LIKE '33%'
    OR code LIKE '73%'
    OR code LIKE '83%'
    OR code IN ('42102', '42202', '43100', '43204', '53200', '53201')
  );

-- 4. Recreate search_noc to include sowp_listed in results.
--    Must DROP first because the return type changes.
DROP FUNCTION IF EXISTS public.search_noc(TEXT, TEXT, INT);

CREATE FUNCTION public.search_noc(
    p_title_query TEXT DEFAULT NULL,
    p_duties      TEXT DEFAULT NULL,
    p_limit       INT  DEFAULT 10
)
RETURNS TABLE (
    code                    TEXT,
    title                   TEXT,
    teer                    SMALLINT,
    broad_category          TEXT,
    lead_statement          TEXT,
    main_duties             TEXT[],
    employment_requirements TEXT,
    example_titles          TEXT[],
    exclusions              TEXT[],
    match_score             REAL,
    sowp_listed             BOOLEAN
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_title_q    TEXT := COALESCE(NULLIF(TRIM(p_title_query), ''), NULL);
    v_duties     TEXT := COALESCE(NULLIF(TRIM(p_duties), ''), NULL);
    v_title_and  TSQUERY;
    v_title_or   TSQUERY;
    v_duty_or    TSQUERY;
BEGIN
    IF v_title_q IS NULL AND v_duties IS NULL THEN
        RETURN;
    END IF;

    IF v_title_q IS NOT NULL THEN
        v_title_and := websearch_to_tsquery('english', v_title_q);
        v_title_or  := text_to_or_tsquery(v_title_q);
    END IF;

    IF v_duties IS NOT NULL THEN
        v_duty_or := text_to_or_tsquery(v_duties);
    END IF;

    RETURN QUERY
    WITH scored AS (
        SELECT
            n.code,
            n.title,
            n.teer,
            n.broad_category,
            n.lead_statement,
            n.main_duties,
            n.employment_requirements,
            n.example_titles,
            n.exclusions,
            n.sowp_listed,
            (
                CASE WHEN v_title_and IS NOT NULL AND n.title_tsv @@ v_title_and
                     THEN ts_rank_cd(n.title_tsv, v_title_and, 32) * 20.0
                     ELSE 0.0 END
                +
                CASE WHEN v_title_or IS NOT NULL AND n.title_tsv @@ v_title_or
                     THEN ts_rank_cd(n.title_tsv, v_title_or, 32) * 6.0
                     ELSE 0.0 END
                +
                CASE WHEN v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.2
                     THEN similarity(n.title, v_title_q) * 5.0
                     ELSE 0.0 END
                +
                CASE WHEN v_title_or IS NOT NULL
                     AND to_tsvector('english', n.example_titles_flat) @@ v_title_or
                     THEN ts_rank_cd(to_tsvector('english', n.example_titles_flat), v_title_or, 32) * 4.0
                     ELSE 0.0 END
                +
                CASE WHEN v_duty_or IS NOT NULL AND n.duties_tsv @@ v_duty_or
                     THEN ts_rank_cd(n.duties_tsv, v_duty_or, 32) * 12.0
                     ELSE 0.0 END
            ) AS raw_score
        FROM ref.noc_occupations n
        WHERE
            (v_title_and IS NOT NULL AND n.title_tsv @@ v_title_and)
            OR
            (v_title_or IS NOT NULL AND n.title_tsv @@ v_title_or)
            OR
            (v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.2)
            OR
            (v_title_or IS NOT NULL
             AND to_tsvector('english', n.example_titles_flat) @@ v_title_or)
            OR
            (v_duty_or IS NOT NULL AND n.duties_tsv @@ v_duty_or)
    ),
    max_score AS (
        SELECT GREATEST(MAX(s.raw_score), 0.001) AS val FROM scored s
    )
    SELECT
        s.code,
        s.title,
        s.teer,
        s.broad_category,
        s.lead_statement,
        s.main_duties,
        s.employment_requirements,
        s.example_titles,
        s.exclusions,
        ((s.raw_score / m.val) * 100.0)::REAL AS match_score,
        s.sowp_listed
    FROM scored s, max_score m
    WHERE s.raw_score > 0 AND (s.raw_score / m.val) >= 0.65
    ORDER BY s.raw_score DESC
    LIMIT p_limit;
END;
$$;
