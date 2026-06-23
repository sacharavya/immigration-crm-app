-- ============================================================================
-- NOC 2021 occupation reference table + search infrastructure.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS ref.noc_occupations (
    code                    TEXT PRIMARY KEY,
    title                   TEXT NOT NULL,
    teer                    SMALLINT NOT NULL CHECK (teer BETWEEN 0 AND 5),
    broad_category          TEXT NOT NULL,
    lead_statement          TEXT NOT NULL DEFAULT '',
    main_duties             TEXT[] NOT NULL DEFAULT '{}',
    employment_requirements TEXT NOT NULL DEFAULT '',
    example_titles          TEXT[] NOT NULL DEFAULT '{}',
    exclusions              TEXT[] NOT NULL DEFAULT '{}',

    -- Maintained by trigger (generated columns can't use array_to_string)
    title_tsv               TSVECTOR,
    example_titles_flat     TEXT NOT NULL DEFAULT '',
    duties_flat             TEXT NOT NULL DEFAULT '',

    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to keep search columns in sync
CREATE OR REPLACE FUNCTION ref.noc_search_columns_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.title_tsv            := to_tsvector('english', NEW.title);
    NEW.example_titles_flat  := array_to_string(NEW.example_titles, ' ');
    NEW.duties_flat          := array_to_string(NEW.main_duties, ' ');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_noc_search_columns ON ref.noc_occupations;
CREATE TRIGGER trg_noc_search_columns
    BEFORE INSERT OR UPDATE ON ref.noc_occupations
    FOR EACH ROW EXECUTE FUNCTION ref.noc_search_columns_trigger();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_noc_title_tsv
    ON ref.noc_occupations USING GIN (title_tsv);

CREATE INDEX IF NOT EXISTS idx_noc_title_trgm
    ON ref.noc_occupations USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_noc_example_titles_trgm
    ON ref.noc_occupations USING GIN (example_titles_flat gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_noc_duties_trgm
    ON ref.noc_occupations USING GIN (duties_flat gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_noc_teer
    ON ref.noc_occupations (teer);

-- ---------------------------------------------------------------------------
-- Search function in PUBLIC schema so PostgREST rpc() finds it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.search_noc(
    p_title_query TEXT DEFAULT NULL,
    p_duties      TEXT DEFAULT NULL,
    p_limit       INT  DEFAULT 20
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
            CASE WHEN v_tsquery IS NOT NULL
                 THEN ts_rank_cd(n.title_tsv, v_tsquery, 32) * 4.0
                 ELSE 0.0 END
            +
            CASE WHEN v_title_q IS NOT NULL
                 THEN similarity(n.title, v_title_q) * 2.0
                 ELSE 0.0 END
            +
            CASE WHEN v_title_q IS NOT NULL
                 THEN similarity(n.example_titles_flat, v_title_q) * 1.5
                 ELSE 0.0 END
            +
            CASE WHEN v_duties IS NOT NULL
                 THEN similarity(n.duties_flat, v_duties) * 3.0
                 ELSE 0.0 END
        )::REAL AS match_score
    FROM ref.noc_occupations n
    WHERE
        (v_tsquery IS NOT NULL AND n.title_tsv @@ v_tsquery)
        OR
        (v_title_q IS NOT NULL AND (
            similarity(n.title, v_title_q) > 0.1
            OR similarity(n.example_titles_flat, v_title_q) > 0.1
        ))
        OR
        (v_duties IS NOT NULL AND similarity(n.duties_flat, v_duties) > 0.05)
    ORDER BY match_score DESC
    LIMIT p_limit;
END;
$$;
