-- ============================================================================
-- Seed ref.countries so deployed environments have the dropdown populated.
--
-- Previously these rows lived in supabase/seed/seed.sql, which only runs on
-- `supabase db reset` (local). `supabase db push` (used to ship migrations
-- to remote/prod) skips the seed directory, so the country dropdown was
-- empty everywhere except a freshly reset local DB.
--
-- Moving the inserts into a migration ensures every environment gets them
-- at deploy time. ON CONFLICT DO NOTHING keeps the file safe to re-run.
-- ============================================================================

INSERT INTO ref.countries (code, name) VALUES
    -- Primary client base (South Asia)
    ('NP', 'Nepal'),
    ('IN', 'India'),
    ('BD', 'Bangladesh'),
    ('PK', 'Pakistan'),
    ('LK', 'Sri Lanka'),
    ('BT', 'Bhutan'),
    ('MM', 'Myanmar'),
    ('AF', 'Afghanistan'),
    -- Anglosphere (target / common travel)
    ('CA', 'Canada'),
    ('US', 'United States'),
    ('GB', 'United Kingdom'),
    ('AU', 'Australia'),
    ('NZ', 'New Zealand'),
    ('IE', 'Ireland'),
    -- East and Southeast Asia
    ('CN', 'China'),
    ('JP', 'Japan'),
    ('KR', 'South Korea'),
    ('TW', 'Taiwan'),
    ('HK', 'Hong Kong'),
    ('SG', 'Singapore'),
    ('MY', 'Malaysia'),
    ('TH', 'Thailand'),
    ('VN', 'Vietnam'),
    ('ID', 'Indonesia'),
    ('PH', 'Philippines'),
    -- Middle East and GCC
    ('AE', 'United Arab Emirates'),
    ('SA', 'Saudi Arabia'),
    ('QA', 'Qatar'),
    ('OM', 'Oman'),
    ('KW', 'Kuwait'),
    ('BH', 'Bahrain'),
    ('JO', 'Jordan'),
    ('LB', 'Lebanon'),
    ('IL', 'Israel'),
    ('IR', 'Iran'),
    ('IQ', 'Iraq'),
    ('SY', 'Syria'),
    ('TR', 'Turkey'),
    -- Africa
    ('EG', 'Egypt'),
    ('NG', 'Nigeria'),
    ('KE', 'Kenya'),
    ('UG', 'Uganda'),
    ('TZ', 'Tanzania'),
    ('ET', 'Ethiopia'),
    ('GH', 'Ghana'),
    ('ZA', 'South Africa'),
    -- Europe
    ('FR', 'France'),
    ('DE', 'Germany'),
    ('IT', 'Italy'),
    ('ES', 'Spain'),
    ('PT', 'Portugal'),
    ('NL', 'Netherlands'),
    ('BE', 'Belgium'),
    ('LU', 'Luxembourg'),
    ('AT', 'Austria'),
    ('CH', 'Switzerland'),
    ('SE', 'Sweden'),
    ('NO', 'Norway'),
    ('DK', 'Denmark'),
    ('FI', 'Finland'),
    ('IS', 'Iceland'),
    ('GR', 'Greece'),
    ('PL', 'Poland'),
    ('CZ', 'Czech Republic'),
    ('SK', 'Slovakia'),
    ('HU', 'Hungary'),
    ('RO', 'Romania'),
    ('BG', 'Bulgaria'),
    ('UA', 'Ukraine'),
    ('RU', 'Russia'),
    -- Americas (other)
    ('MX', 'Mexico'),
    ('BR', 'Brazil'),
    ('AR', 'Argentina'),
    ('CL', 'Chile'),
    ('CO', 'Colombia'),
    ('PE', 'Peru'),
    ('VE', 'Venezuela'),
    ('CU', 'Cuba'),
    ('JM', 'Jamaica'),
    ('TT', 'Trinidad and Tobago'),
    -- Oceania (other)
    ('FJ', 'Fiji'),
    ('PG', 'Papua New Guinea')
ON CONFLICT (code) DO NOTHING;
