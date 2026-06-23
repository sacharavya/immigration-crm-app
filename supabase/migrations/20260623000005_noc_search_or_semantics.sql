-- Fix: websearch_to_tsquery creates AND queries from long text, which
-- requires ALL keywords to match. For duties we need OR semantics so
-- matching most keywords still returns results. Also add plainto_tsquery
-- for the title field to catch multi-word job titles that aren't
-- exact NOC titles.

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
    v_title_plain TSQUERY;
    v_duty_ts  TSQUERY;
BEGIN
    IF v_title_q IS NULL AND v_duties IS NULL THEN
        RETURN;
    END IF;

    IF v_title_q IS NOT NULL THEN
        -- websearch for structured queries ("software engineer")
        v_title_ts := websearch_to_tsquery('english', v_title_q);
        -- plainto for OR-style matching (each word independently)
        v_title_plain := plainto_tsquery('english', v_title_q);
    END IF;

    IF v_duties IS NOT NULL THEN
        -- OR semantics: each keyword from duties matches independently.
        -- This way an occupation matching 8 of 10 keywords ranks high
        -- even if it doesn't contain all 10.
        v_duty_ts := plainto_tsquery('english', v_duties);
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
                -- Exact FTS match on title (strongest signal)
                CASE WHEN v_title_ts IS NOT NULL AND n.title_tsv @@ v_title_ts
                     THEN ts_rank_cd(n.title_tsv, v_title_ts, 32) * 20.0
                     ELSE 0.0 END
                +
                -- Fuzzy FTS match on title (OR - catches partial matches)
                CASE WHEN v_title_plain IS NOT NULL AND n.title_tsv @@ v_title_plain
                     THEN ts_rank_cd(n.title_tsv, v_title_plain, 32) * 8.0
                     ELSE 0.0 END
                +
                -- Direct title trigram similarity
                CASE WHEN v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.25
                     THEN similarity(n.title, v_title_q) * 6.0
                     ELSE 0.0 END
                +
                -- FTS on example titles (catches alternate job titles)
                CASE WHEN v_title_plain IS NOT NULL
                     AND to_tsvector('english', n.example_titles_flat) @@ v_title_plain
                     THEN ts_rank_cd(to_tsvector('english', n.example_titles_flat), v_title_plain, 32) * 5.0
                     ELSE 0.0 END
                +
                -- FTS on duties with OR semantics (keyword overlap ranking)
                CASE WHEN v_duty_ts IS NOT NULL AND n.duties_tsv @@ v_duty_ts
                     THEN ts_rank_cd(n.duties_tsv, v_duty_ts, 32) * 12.0
                     ELSE 0.0 END
            ) AS raw_score
        FROM ref.noc_occupations n
        WHERE
            (v_title_ts IS NOT NULL AND n.title_tsv @@ v_title_ts)
            OR
            (v_title_plain IS NOT NULL AND n.title_tsv @@ v_title_plain)
            OR
            (v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.25)
            OR
            (v_title_plain IS NOT NULL
             AND to_tsvector('english', n.example_titles_flat) @@ v_title_plain)
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
