-- Further tighten NOC search: higher thresholds, less trigram noise.

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
    v_title_q TEXT := COALESCE(NULLIF(TRIM(p_title_query), ''), NULL);
    v_duties  TEXT := COALESCE(NULLIF(TRIM(p_duties), ''), NULL);
    v_tsquery TSQUERY;
BEGIN
    IF v_title_q IS NULL AND v_duties IS NULL THEN
        RETURN;
    END IF;

    IF v_title_q IS NOT NULL THEN
        v_tsquery := websearch_to_tsquery('english', v_title_q);
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
                -- FTS rank on title (strongest signal)
                CASE WHEN v_tsquery IS NOT NULL AND n.title_tsv @@ v_tsquery
                     THEN ts_rank_cd(n.title_tsv, v_tsquery, 32) * 15.0
                     ELSE 0.0 END
                +
                -- Direct title similarity
                CASE WHEN v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.3
                     THEN similarity(n.title, v_title_q) * 8.0
                     ELSE 0.0 END
                +
                -- Example titles (only count if strong match)
                CASE WHEN v_title_q IS NOT NULL AND similarity(n.example_titles_flat, v_title_q) > 0.3
                     THEN similarity(n.example_titles_flat, v_title_q) * 3.0
                     ELSE 0.0 END
                +
                -- Duty similarity (only count if strong match)
                CASE WHEN v_duties IS NOT NULL AND similarity(n.duties_flat, v_duties) > 0.2
                     THEN similarity(n.duties_flat, v_duties) * 5.0
                     ELSE 0.0 END
            ) AS raw_score
        FROM ref.noc_occupations n
        WHERE
            -- FTS hit
            (v_tsquery IS NOT NULL AND n.title_tsv @@ v_tsquery)
            OR
            -- Strong title similarity
            (v_title_q IS NOT NULL AND similarity(n.title, v_title_q) > 0.3)
            OR
            -- Strong example title similarity
            (v_title_q IS NOT NULL AND similarity(n.example_titles_flat, v_title_q) > 0.3)
            OR
            -- Strong duty similarity
            (v_duties IS NOT NULL AND similarity(n.duties_flat, v_duties) > 0.2)
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
