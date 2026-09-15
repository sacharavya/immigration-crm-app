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

    SELECT count(*) INTO n FROM crm.clients;
    IF n <> 1 THEN RAISE EXCEPTION 'A sees % clients, expected only its own 1', n; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full = 'Beta Client';
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm A can read firm B client rows'; END IF;

    SELECT count(*) INTO n FROM crm.staff;
    IF n <> 1 THEN RAISE EXCEPTION 'LEAK: firm A sees % staff rows', n; END IF;

    SELECT count(*) INTO n FROM crm.tenants;
    IF n <> 1 THEN RAISE EXCEPTION 'LEAK: firm A can enumerate % tenants', n; END IF;

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
    SELECT count(*) INTO n FROM crm.clients;
    IF n <> 1 THEN RAISE EXCEPTION 'firm B sees % clients, expected its own 1', n; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE legal_name_full LIKE '%Alpha%';
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm B can read firm A client rows'; END IF;
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

-- ---- notification fan-out stays inside one firm -------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.user_a'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
    SELECT count(*) INTO n FROM crm.staff_ids_with_permission('view_clients');
    IF n <> 1 THEN
        RAISE EXCEPTION 'LEAK: permission fan-out returned % staff, crossing firms', n;
    END IF;
END $$;

RESET ROLE;

-- ---- cross-tenant case assignment is refused ----------------------------
DO $$
DECLARE v_case UUID; v_bob UUID; v_st UUID;
BEGIN
    SELECT id INTO v_st FROM ref.service_types LIMIT 1;
    IF v_st IS NULL THEN RETURN; END IF;  -- no seeded service types; skip

    SELECT id INTO v_bob FROM crm.staff WHERE email = 'b@b.test';
    INSERT INTO crm.cases (tenant_id, client_id, case_number, service_type_id)
    SELECT current_setting('test.tenant_a')::uuid, c.id, 'BB-2026-9001', v_st
      FROM crm.clients c WHERE c.legal_name_full = 'Alpha Client'
    RETURNING id INTO v_case;

    BEGIN
        INSERT INTO crm.case_assignments (tenant_id, case_id, staff_id, role)
        VALUES (current_setting('test.tenant_a')::uuid, v_case, v_bob, 'case_manager');
        RAISE EXCEPTION 'LEAK: assigned firm B staff to a firm A case';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'LEAK:%' THEN RAISE; END IF;
    END;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL TENANT ISOLATION CHECKS PASSED'; END $$;

ROLLBACK;
