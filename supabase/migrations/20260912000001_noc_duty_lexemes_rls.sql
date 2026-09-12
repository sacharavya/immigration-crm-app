-- Security advisor: ref.noc_duty_lexemes was created (20260829000003)
-- without RLS in a PostgREST-exposed schema. The content is public
-- reference data (word frequencies from the Statistics Canada NOC 2021
-- dataset), so the policy is world-readable; enabling RLS closes the
-- advisory and blocks any future write path except service_role.
ALTER TABLE ref.noc_duty_lexemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY noc_duty_lexemes_read ON ref.noc_duty_lexemes
    FOR SELECT TO anon, authenticated
    USING (true);
