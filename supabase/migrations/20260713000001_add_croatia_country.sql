-- Croatia (ISO 3166-1 alpha-2 "HR") was missing from the initial country seed
-- (20260512000001_seed_countries.sql). Add it so it appears in the country
-- dropdowns. Idempotent — safe to re-run and safe on any environment that
-- somehow already has the row.
INSERT INTO ref.countries (code, name) VALUES ('HR', 'Croatia')
ON CONFLICT (code) DO NOTHING;
