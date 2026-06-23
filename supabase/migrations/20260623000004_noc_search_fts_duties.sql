-- Rewrite NOC search: use full-text search on duties (not trigram),
-- add a tsvector column for duties, and weight FTS hits properly.

-- 1. Add duties tsvector column
ALTER TABLE ref.noc_occupations
    ADD COLUMN IF NOT EXISTS duties_tsv TSVECTOR;

-- 2. Update trigger to populate it
CREATE OR REPLACE FUNCTION ref.noc_search_columns_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.title_tsv            := to_tsvector('english', NEW.title);
    NEW.example_titles_flat  := array_to_string(NEW.example_titles, ' ');
    NEW.duties_flat          := array_to_string(NEW.main_duties, ' ');
    NEW.duties_tsv           := to_tsvector('english', array_to_string(NEW.main_duties, ' '));
    RETURN NEW;
END;
$$;

-- 3. Backfill existing rows
UPDATE ref.noc_occupations SET
    duties_tsv = to_tsvector('english', array_to_string(main_duties, ' '));

-- 4. GIN index on duties tsvector
CREATE INDEX IF NOT EXISTS idx_noc_duties_tsv
    ON ref.noc_occupations USING GIN (duties_tsv);

-- 5. Rewrite search function
CREATE OR REPLACE FUNCTION public.search_noc(
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
    match_score             REAL
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_title_q  TEXT := COALESCE(NULLIF(TRIM(p_title_query), ''), NULL);
    v_duties   TEXT := COALESCE(NULLIF(TRIM(p_duties), ''), NULL);
    v_title_ts TSQUERY;
    v_duty_ts  TSQUERY;
BEGIN
    IF v_title_q IS NULL AND v_duties IS NULL THEN
        RETURN;
    END IF;

    IF v_title_q IS NOT NULL THEN
        v_title_ts := websearch_to_tsquery('english', v_title_q);
    END IF;
    IF v_duties IS NOT NULL THEN
        -- Extract meaningful keywords from duties text for FTS matching
        v_duty_ts := websearch_to_tsquery('english', v_duties);
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
            (
                -- FTS on title (strongest signal for title queries)
                CASE WHEN v_title_ts IS NOT NULL AND n.title_tsv @@ v_title_ts
                     THEN ts_rank_cd(n.title_tsv, v_title_ts, 32) * 15.0
                     ELSE 0.0 END
                +
                -- Direct title similarity (good for exact name matches)
                CASE WHEN v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.3
                     THEN similarity(n.title, v_title_q) * 8.0
                     ELSE 0.0 END
                +
                -- FTS on example titles (catches alternate job titles)
                CASE WHEN v_title_ts IS NOT NULL AND
                     to_tsvector('english', n.example_titles_flat) @@ v_title_ts
                     THEN ts_rank_cd(to_tsvector('english', n.example_titles_flat), v_title_ts, 32) * 6.0
                     ELSE 0.0 END
                +
                -- FTS on duties (semantic keyword matching, not trigram)
                CASE WHEN v_duty_ts IS NOT NULL AND n.duties_tsv @@ v_duty_ts
                     THEN ts_rank_cd(n.duties_tsv, v_duty_ts, 32) * 10.0
                     ELSE 0.0 END
                +
                -- Title similarity against duty keywords (catches cases where
                -- the user describes duties that name the occupation)
                CASE WHEN v_duties IS NOT NULL AND v_title_ts IS NULL
                     AND similarity(n.title, v_duties) > 0.15
                     THEN similarity(n.title, v_duties) * 2.0
                     ELSE 0.0 END
            ) AS raw_score
        FROM ref.noc_occupations n
        WHERE
            -- At least one FTS hit or strong title similarity
            (v_title_ts IS NOT NULL AND n.title_tsv @@ v_title_ts)
            OR
            (v_title_ts IS NOT NULL AND to_tsvector('english', n.example_titles_flat) @@ v_title_ts)
            OR
            (v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.3)
            OR
            (v_duty_ts IS NOT NULL AND n.duties_tsv @@ v_duty_ts)
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
        ((s.raw_score / m.val) * 100.0)::REAL AS match_score
    FROM scored s, max_score m
    WHERE s.raw_score > 0 AND (s.raw_score / m.val) >= 0.50
    ORDER BY s.raw_score DESC
    LIMIT p_limit;
END;
$$;
