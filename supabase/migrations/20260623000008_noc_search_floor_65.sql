-- Raise DB-level floor from 50% to 65% of top match to reduce noise.

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
        ((s.raw_score / m.val) * 100.0)::REAL AS match_score
    FROM scored s, max_score m
    WHERE s.raw_score > 0 AND (s.raw_score / m.val) >= 0.65
    ORDER BY s.raw_score DESC
    LIMIT p_limit;
END;
$$;
