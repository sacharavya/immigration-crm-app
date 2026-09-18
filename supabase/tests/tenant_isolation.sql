-- Two-tenant isolation proof. Run against a freshly reset local DB:
--   psql "$LOCAL_DB" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
-- Every assertion below raises an exception on failure, so a clean run to
-- "ALL TENANT ISOLATION CHECKS PASSED" is the pass condition.

\set ON_ERROR_STOP on
BEGIN;

-- ---- fixtures: two firms, one staff member each -------------------------
DO $$
DECLARE
    v_a UUID; v_b UUID; v_ua UUID := gen_random_uuid(); v_ub UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_a FROM crm.tenants WHERE slug = 'genzdatalabs';
    v_b := crm.provision_tenant('Rival Immigration', 'rival', 'RV');

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@a.test', '', now(), now(), now()),
           (v_ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@b.test', '', now(), now(), now());

    INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role)
    VALUES (v_a, v_ua, 'Ann', 'Alpha', 'a@a.test', 'super_user'),
           (v_b, v_ub, 'Bob', 'Beta',  'b@b.test', 'super_user');

    -- One client per firm.
    INSERT INTO crm.clients (tenant_id, client_number, legal_name_full, email, status)
    VALUES (v_a, 'BB-C-2026-9001', 'Alpha Client', 'ac@test.com', 'lead'),
           (v_b, 'RV-C-2026-9001', 'Beta Client',  'bc@test.com', 'lead');

    PERFORM set_config('test.tenant_a', v_a::text, false);
    PERFORM set_config('test.tenant_b', v_b::text, false);
    PERFORM set_config('test.user_a', v_ua::text, false);
    PERFORM set_config('test.user_b', v_ub::text, false);
END $$;

-- ---- act as firm A -------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; v_b UUID := current_setting('test.tenant_b')::uuid;
BEGIN
    IF crm.current_tenant_id()::text <> current_setting('test.tenant_a') THEN
        RAISE EXCEPTION 'current_tenant_id did not resolve to firm A';
    END IF;

    -- Every row visible must belong to firm A. This holds regardless of
    -- how much real data the default firm already has.
    SELECT count(*) INTO n FROM crm.clients
     WHERE tenant_id::text IS DISTINCT FROM current_setting('test.tenant_a');
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A sees % foreign client rows', n; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full = 'Beta Client';
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A can read firm B client rows'; END IF;

    -- ...and firm A's own row is genuinely readable, so this is isolation
    -- rather than the table simply being closed to everyone.
    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full = 'Alpha Client';
    IF n <> 1 THEN RAISE EXCEPTION 'firm A cannot read its own client row'; END IF;

    SELECT count(*) INTO n FROM crm.staff
     WHERE tenant_id::text IS DISTINCT FROM current_setting('test.tenant_a');
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A sees % foreign staff rows', n; END IF;

    SELECT count(*) INTO n FROM crm.staff WHERE email = 'b@b.test';
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A can read firm B staff'; END IF;

    SELECT count(*) INTO n FROM crm.tenants
     WHERE id::text IS DISTINCT FROM current_setting('test.tenant_a');
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A can enumerate other tenants'; END IF;

    -- Writing into another firm must be refused by the WITH CHECK clause.
    BEGIN
        INSERT INTO crm.clients (tenant_id, client_number, legal_name_full, status)
        VALUES (v_b, 'RV-C-2026-9999', 'Smuggled', 'lead');
        RAISE EXCEPTION 'LEAK: firm A inserted a row into firm B';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    -- Updating another firm's row must be a no-op, not an error.
    UPDATE crm.clients SET legal_name_full = 'Hijacked' WHERE legal_name_full = 'Beta Client';
    IF FOUND THEN RAISE EXCEPTION 'LEAK: firm A updated a firm B row'; END IF;

    -- An insert that omits tenant_id must land in the caller's own tenant.
    INSERT INTO crm.clients (client_number, legal_name_full, status)
    VALUES ('BB-C-2026-9002', 'Defaulted Client', 'lead');
    SELECT count(*) INTO n FROM crm.clients
     WHERE legal_name_full = 'Defaulted Client'
       AND tenant_id::text = current_setting('test.tenant_a');
    IF n <> 1 THEN RAISE EXCEPTION 'column default did not stamp the caller tenant'; END IF;

    -- Shared catalogs stay readable (global rows, tenant_id IS NULL).
    SELECT count(*) INTO n FROM ref.checklist_groups;
    IF n = 0 THEN RAISE EXCEPTION 'shared catalog became invisible to tenants'; END IF;
END $$;

RESET ROLE;

-- ---- act as firm B -------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.user_b'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n FROM crm.clients
     WHERE tenant_id::text IS DISTINCT FROM current_setting('test.tenant_b');
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm B sees % foreign client rows', n; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full LIKE '%Alpha%';
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm B can read firm A client rows'; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full = 'Beta Client';
    IF n <> 1 THEN RAISE EXCEPTION 'firm B cannot read its own client row'; END IF;
END $$;

RESET ROLE;

-- ---- numbering is per firm, and starts at 0001 for each -----------------
DO $$
DECLARE a1 TEXT; a2 TEXT; b1 TEXT;
BEGIN
    a1 := crm.generate_case_number(current_setting('test.tenant_a')::uuid);
    a2 := crm.generate_case_number(current_setting('test.tenant_a')::uuid);
    b1 := crm.generate_case_number(current_setting('test.tenant_b')::uuid);

    IF a1 = b1 THEN RAISE EXCEPTION 'two firms got the same case number: %', a1; END IF;
    IF a1 = a2 THEN RAISE EXCEPTION 'same firm got a duplicate case number: %', a1; END IF;
    IF b1 NOT LIKE 'RV-%' THEN RAISE EXCEPTION 'firm B number ignored its prefix: %', b1; END IF;
    IF right(b1, 4) <> '0001' THEN RAISE EXCEPTION 'new firm did not start at 0001: %', b1; END IF;
    IF right(a2, 4) <= right(a1, 4) THEN RAISE EXCEPTION 'numbering did not advance: % then %', a1, a2; END IF;
END $$;

-- ---- the no-argument generators still resolve (regression) ---------------
-- These are called with no arguments from all ten app call sites. A migration
-- once left a zero-arg overload behind, which made every such call ambiguous
-- and broke client and case creation everywhere. Passing an explicit tenant,
-- as the test above does, would not have caught it.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text, true);

DO $$
DECLARE c TEXT; k TEXT;
BEGIN
    c := crm.generate_client_number();
    k := crm.generate_case_number();
    IF c IS NULL OR k IS NULL THEN
        RAISE EXCEPTION 'no-argument generators returned NULL';
    END IF;
    IF c NOT LIKE 'BB-C-%' OR k NOT LIKE 'BB-%' THEN
        RAISE EXCEPTION 'no-argument generators ignored the caller tenant: %, %', c, k;
    END IF;
END $$;

RESET ROLE;

-- ---- a referral agent resolves a tenant too (regression) -----------------
-- current_tenant_id() once read only crm.staff, so agents resolved NULL and
-- every policy denied them: the whole agent portal was locked out.
DO $$
DECLARE v_b UUID := current_setting('test.tenant_b')::uuid; v_u UUID := gen_random_uuid();
BEGIN
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'agent@b.test', '', now(), now(), now());
    INSERT INTO crm.referral_agents (tenant_id, auth_user_id, name, email, is_active)
    VALUES (v_b, v_u, 'Agent B', 'agent@b.test', TRUE);
    PERFORM set_config('test.agent_b', v_u::text, false);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.agent_b'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
    IF crm.current_tenant_id()::text IS DISTINCT FROM current_setting('test.tenant_b') THEN
        RAISE EXCEPTION 'a referral agent does not resolve their own firm';
    END IF;

    SELECT count(*) INTO n FROM crm.clients
     WHERE tenant_id::text IS DISTINCT FROM current_setting('test.tenant_b');
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: agent sees % foreign client rows', n; END IF;
END $$;

RESET ROLE;

-- ---- notification fan-out stays inside one firm -------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n
      FROM crm.staff_ids_with_permission('view_clients') f
      JOIN crm.staff s ON s.id = f.staff_id
     WHERE s.tenant_id::text IS DISTINCT FROM current_setting('test.tenant_a');
    IF n <> 0 THEN
        RAISE EXCEPTION 'LEAK: permission fan-out reached % staff at other firms', n;
    END IF;

    SELECT count(*) INTO n FROM crm.staff_ids_with_permission('view_clients');
    IF n = 0 THEN RAISE EXCEPTION 'fan-out returned nobody, so the check is vacuous'; END IF;
END $$;

RESET ROLE;

-- ---- cross-tenant case assignment is refused ----------------------------
DO $$
DECLARE v_case UUID; v_bob UUID; v_ann UUID; v_st UUID; v_tpl UUID; v_client UUID;
BEGIN
    -- Create the reference rows this needs rather than skipping when they are
    -- absent. The previous version returned early if ref.service_types was
    -- empty, so on a fresh database this whole check quietly did nothing —
    -- and once real data appeared it failed on columns it never set.
    SELECT id INTO v_st FROM ref.service_types WHERE tenant_id IS NULL LIMIT 1;
    IF v_st IS NULL THEN
        INSERT INTO ref.service_types (code, name, category_code)
        VALUES ('test_svc', 'Test Service',
                (SELECT code FROM ref.service_categories LIMIT 1))
        RETURNING id INTO v_st;
    END IF;

    SELECT id INTO v_tpl FROM ref.service_templates WHERE service_type_id = v_st LIMIT 1;
    IF v_tpl IS NULL THEN
        INSERT INTO ref.service_templates (service_type_id, version, effective_from)
        VALUES (v_st, 1, CURRENT_DATE) RETURNING id INTO v_tpl;
    END IF;

    SELECT id INTO v_bob FROM crm.staff WHERE email = 'b@b.test';
    SELECT id INTO v_ann FROM crm.staff WHERE email = 'a@a.test';
    SELECT id INTO v_client FROM crm.clients WHERE legal_name_full = 'Alpha Client';

    INSERT INTO crm.cases (tenant_id, client_id, case_number, service_type_id,
                           service_template_id, assigned_rcic, quoted_fee_cad)
    VALUES (current_setting('test.tenant_a')::uuid, v_client, 'BB-2026-9001',
            v_st, v_tpl, v_ann, 0)
    RETURNING id INTO v_case;

    BEGIN
        INSERT INTO crm.case_assignments (tenant_id, case_id, staff_id, role)
        VALUES (current_setting('test.tenant_a')::uuid, v_case, v_bob, 'case_worker');
        RAISE EXCEPTION 'LEAK: assigned firm B staff to a firm A case';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'LEAK:%' THEN RAISE; END IF;
    END;
END $$;

-- ---- no ambiguous function overloads -------------------------------------
-- Adding a defaulted parameter with CREATE OR REPLACE silently creates an
-- overload instead of replacing, and every existing call then fails with
-- 'function is not unique'. It has happened twice: the number generators and
-- staff_ids_with_permission. Catch the next one here rather than in the app.
DO $$
DECLARE v_dupes TEXT;
BEGIN
    SELECT string_agg(sig, ', ') INTO v_dupes
      FROM (
        SELECT n.nspname || '.' || p.proname AS sig
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname IN ('crm', 'platform', 'files')
           AND p.prokind = 'f'
         GROUP BY n.nspname, p.proname
        HAVING count(*) > 1
      ) d;
    IF v_dupes IS NOT NULL THEN
        RAISE EXCEPTION 'Overloaded functions, likely accidental: %', v_dupes;
    END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL TENANT ISOLATION CHECKS PASSED'; END $$;

ROLLBACK;
