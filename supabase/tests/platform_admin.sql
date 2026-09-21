-- Proves the platform operator can manage firms but cannot read their data.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_a UUID; v_b UUID;
    v_staff_user UUID := gen_random_uuid();
    v_admin_user UUID := gen_random_uuid();
BEGIN
    SELECT id INTO v_a FROM crm.tenants WHERE slug = 'genzdatalabs';
    v_b := crm.provision_tenant('Rival Immigration', 'rival', 'RV');

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_staff_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 's@a.test', '', now(), now(), now()),
           (v_admin_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ops@platform.test', '', now(), now(), now());

    INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role)
    VALUES (v_a, v_staff_user, 'Sam', 'Staff', 's@a.test', 'super_user');

    INSERT INTO crm.clients (tenant_id, client_number, legal_name_full, email, status)
    VALUES (v_a, 'BB-C-2026-8001', 'Confidential Person', 'cp@test.com', 'lead'),
           (v_b, 'RV-C-2026-8001', 'Other Firm Person',   'ofp@test.com', 'lead');

    -- The operator: an auth user with NO crm.staff row anywhere.
    INSERT INTO platform.admins (auth_user_id, email, full_name)
    VALUES (v_admin_user, 'ops@platform.test', 'Platform Operator');

    INSERT INTO platform.feedback (tenant_id, kind, subject, body)
    VALUES (v_a, 'complaint', 'Uploads are slow', 'Document uploads take 30s.');

    PERFORM set_config('test.admin_user', v_admin_user::text, false);
    PERFORM set_config('test.staff_user', v_staff_user::text, false);
    PERFORM set_config('test.tenant_a', v_a::text, false);
    -- Captured as superuser: the operator session below cannot count clients,
    -- which is exactly the isolation this file asserts.
    PERFORM set_config('test.expected_a',
        (SELECT count(*)::text FROM crm.clients
          WHERE tenant_id = v_a AND deleted_at IS NULL), false);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.admin_user'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; expected_a INT; v_new UUID;
BEGIN
    IF NOT platform.is_admin() THEN RAISE EXCEPTION 'operator not recognised as admin'; END IF;

    -- MUST NOT see any tenant business data.
    SELECT count(*) INTO n FROM crm.clients;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % client rows', n; END IF;

    SELECT count(*) INTO n FROM crm.cases;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % case rows', n; END IF;

    SELECT count(*) INTO n FROM crm.staff;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % staff rows', n; END IF;

    SELECT count(*) INTO n FROM files.documents;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % document rows', n; END IF;

    SELECT count(*) INTO n FROM crm.payments;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % payment rows', n; END IF;

    SELECT count(*) INTO n FROM audit.change_log;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: operator can read % audit rows', n; END IF;

    -- MUST be able to manage the firms themselves.
    SELECT count(*) INTO n FROM crm.tenants;
    IF n < 2 THEN RAISE EXCEPTION 'operator cannot enumerate tenants (saw %)', n; END IF;

    INSERT INTO crm.tenants (name, slug, number_prefix)
    VALUES ('Third Firm', 'third', 'TF') RETURNING id INTO v_new;

    UPDATE crm.tenants SET status = 'suspended' WHERE id = v_new;
    IF NOT FOUND THEN RAISE EXCEPTION 'operator could not suspend a tenant'; END IF;

    UPDATE crm.tenants SET features = '{"pdf_tool": false}'::jsonb WHERE id = v_new;
    IF crm.tenant_feature_enabled(v_new, 'pdf_tool') THEN
        RAISE EXCEPTION 'feature toggle did not take effect';
    END IF;
    IF NOT crm.tenant_feature_enabled(v_new, 'reports') THEN
        RAISE EXCEPTION 'unset feature should fall back to the catalogue default';
    END IF;

    -- Usage aggregates are allowed; individual rows are not.
    SELECT count(*) INTO n FROM platform.tenant_usage();
    IF n < 3 THEN RAISE EXCEPTION 'tenant_usage returned % rows', n; END IF;

    -- Compare against the real number rather than assuming an empty database:
    -- the point is that the aggregate matches, not that it equals 1.
    SELECT client_count INTO n FROM platform.tenant_usage()
     WHERE tenant_id::text = current_setting('test.tenant_a');
    expected_a := current_setting('test.expected_a')::int;
    IF n <> expected_a THEN
        RAISE EXCEPTION 'usage count %, expected %', n, expected_a;
    END IF;

    -- Support inbox is visible and answerable.
    SELECT count(*) INTO n FROM platform.feedback;
    IF n <> 1 THEN RAISE EXCEPTION 'operator sees % feedback rows, expected 1', n; END IF;

    UPDATE platform.feedback
       SET status = 'in_progress', admin_response = 'Looking into it.', responded_at = now();
    IF NOT FOUND THEN RAISE EXCEPTION 'operator could not respond to feedback'; END IF;
END $$;

RESET ROLE;

-- ---- a firm's staff must NOT reach the platform layer -------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.staff_user'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT;
BEGIN
    IF platform.is_admin() THEN RAISE EXCEPTION 'LEAK: firm staff pass the admin check'; END IF;

    SELECT count(*) INTO n FROM platform.admins;
    IF n <> 0 THEN RAISE EXCEPTION 'LEAK: firm staff can read the operator roster'; END IF;

    SELECT count(*) INTO n FROM crm.tenants;
    IF n <> 1 THEN RAISE EXCEPTION 'LEAK: firm staff can see % tenants', n; END IF;

    -- Own tickets only.
    SELECT count(*) INTO n FROM platform.feedback;
    IF n <> 1 THEN RAISE EXCEPTION 'firm sees % of its own tickets, expected 1', n; END IF;

    BEGIN
        UPDATE crm.tenants SET status = 'suspended'
         WHERE id::text = current_setting('test.tenant_a');
        IF FOUND THEN RAISE EXCEPTION 'LEAK: firm staff suspended their own tenant'; END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        INSERT INTO platform.admins (auth_user_id, email, full_name)
        VALUES (current_setting('test.staff_user')::uuid, 'escalate@a.test', 'Escalated');
        RAISE EXCEPTION 'LEAK: firm staff made themselves a platform admin';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL PLATFORM ADMIN CHECKS PASSED'; END $$;
ROLLBACK;
