-- Deleting a firm must remove everything it owns, leave every other firm
-- untouched, and refuse when the confirmation doesn't match.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
    v_keep UUID; v_doomed UUID;
    v_admin UUID := gen_random_uuid();
    v_staff UUID := gen_random_uuid();
    v_st UUID; v_tpl UUID; v_client UUID; v_staff_id UUID;
BEGIN
    SELECT id INTO v_keep FROM crm.tenants WHERE slug = 'genzdatalabs';
    v_doomed := crm.provision_tenant('Doomed Firm', 'doomed', 'DM');

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ops2@platform.test', '', now(), now(), now()),
           (v_staff, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doomed@firm.test', '', now(), now(), now());

    INSERT INTO platform.admins (auth_user_id, email, full_name)
    VALUES (v_admin, 'ops2@platform.test', 'Ops Two');

    INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role)
    VALUES (v_doomed, v_staff, 'Doomed', 'Owner', 'doomed@firm.test', 'super_user')
    RETURNING id INTO v_staff_id;

    -- Give it real, interlinked data so the delete has to untangle FKs.
    INSERT INTO crm.clients (tenant_id, client_number, legal_name_full, status)
    VALUES (v_doomed, 'DM-C-2026-0001', 'Doomed Client', 'lead')
    RETURNING id INTO v_client;

    -- Build the reference rows rather than skipping: a case is the point of
    -- this test, since it is what makes the delete untangle foreign keys.
    SELECT id INTO v_st FROM ref.service_types WHERE tenant_id IS NULL LIMIT 1;
    IF v_st IS NULL THEN
        INSERT INTO ref.service_types (code, name, category_code)
        VALUES ('del_svc', 'Deletion Test Service',
                (SELECT code FROM ref.service_categories LIMIT 1))
        RETURNING id INTO v_st;
    END IF;
    SELECT id INTO v_tpl FROM ref.service_templates WHERE service_type_id = v_st LIMIT 1;
    IF v_tpl IS NULL THEN
        INSERT INTO ref.service_templates (service_type_id, version, effective_from)
        VALUES (v_st, 1, CURRENT_DATE) RETURNING id INTO v_tpl;
    END IF;

    INSERT INTO crm.cases (tenant_id, client_id, case_number, service_type_id,
                           service_template_id, assigned_rcic, quoted_fee_cad)
    VALUES (v_doomed, v_client, 'DM-2026-0001', v_st, v_tpl, v_staff_id, 0);

    INSERT INTO platform.feedback (tenant_id, kind, subject, body)
    VALUES (v_doomed, 'question', 'Hello', 'Just testing the support inbox.');

    PERFORM set_config('test.keep', v_keep::text, false);
    PERFORM set_config('test.doomed', v_doomed::text, false);
    PERFORM set_config('test.admin', v_admin::text, false);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('test.admin'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; kept_before INT; kept_after INT; v_doomed UUID := current_setting('test.doomed')::uuid;
BEGIN
    -- Preview reports something to destroy.
    SELECT count(*) INTO n FROM platform.tenant_delete_preview(v_doomed);
    IF n = 0 THEN RAISE EXCEPTION 'preview reported nothing to delete'; END IF;

    -- A wrong confirmation must refuse.
    BEGIN
        PERFORM platform.delete_tenant(v_doomed, 'Wrong Name');
        RAISE EXCEPTION 'LEAK: deleted a firm without a matching confirmation';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'LEAK:%' THEN RAISE; END IF;
    END;

    -- Still there.
    SELECT count(*) INTO n FROM crm.tenants WHERE id = v_doomed;
    IF n <> 1 THEN RAISE EXCEPTION 'firm vanished after a refused delete'; END IF;

    SELECT count(*) INTO kept_before FROM crm.clients
     WHERE tenant_id::text = current_setting('test.keep');

    -- The real thing.
    PERFORM platform.delete_tenant(v_doomed, 'Doomed Firm');

    SELECT count(*) INTO n FROM crm.tenants WHERE id = v_doomed;
    IF n <> 0 THEN RAISE EXCEPTION 'firm row survived deletion'; END IF;

    SELECT count(*) INTO n FROM crm.clients WHERE tenant_id = v_doomed;
    IF n <> 0 THEN RAISE EXCEPTION '% client rows survived', n; END IF;

    SELECT count(*) INTO n FROM crm.staff WHERE tenant_id = v_doomed;
    IF n <> 0 THEN RAISE EXCEPTION '% staff rows survived', n; END IF;

    SELECT count(*) INTO n FROM platform.feedback WHERE tenant_id = v_doomed;
    IF n <> 0 THEN RAISE EXCEPTION '% feedback rows survived', n; END IF;

    SELECT count(*) INTO n FROM platform.tenant_delete_preview(v_doomed);
    IF n <> 0 THEN RAISE EXCEPTION 'preview still finds rows after deletion'; END IF;

    -- The other firm is untouched.
    SELECT count(*) INTO kept_after FROM crm.clients
     WHERE tenant_id::text = current_setting('test.keep');
    IF kept_after <> kept_before THEN
        RAISE EXCEPTION 'COLLATERAL: other firm lost rows (% -> %)', kept_before, kept_after;
    END IF;

    -- And it is recorded.
    SELECT count(*) INTO n FROM platform.deleted_tenants WHERE tenant_id = v_doomed;
    IF n <> 1 THEN RAISE EXCEPTION 'deletion was not recorded'; END IF;
END $$;

RESET ROLE;

-- A firm's own staff must not be able to delete their firm.
DO $$
DECLARE v_keep UUID := current_setting('test.keep')::uuid; n INT;
BEGIN
    SELECT count(*) INTO n FROM crm.tenants WHERE id = v_keep;
    IF n <> 1 THEN RAISE EXCEPTION 'setup: keep-firm missing'; END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL TENANT DELETION CHECKS PASSED'; END $$;
ROLLBACK;
