-- Fix: text_to_or_tsquery produces empty entries for stop words,
-- creating invalid tsquery like "'word' |  | 'word'".
-- Filter out words that produce empty tsqueries.

CREATE OR REPLACE FUNCTION public.text_to_or_tsquery(p_text TEXT)
RETURNS TSQUERY LANGUAGE sql IMMUTABLE AS $$
    SELECT string_agg(q::TEXT, ' | ')::TSQUERY
    FROM (
        SELECT plainto_tsquery('english', word) AS q
        FROM unnest(string_to_array(
            regexp_replace(TRIM(p_text), '[^a-zA-Z0-9\s]', ' ', 'g'),
            ' '
        )) AS word
        WHERE length(TRIM(word)) >= 3
          AND plainto_tsquery('english', word)::TEXT <> ''
    ) sub
    WHERE q IS NOT NULL
      AND q::TEXT <> '';
$$;
