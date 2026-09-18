-- A firm's stored OAuth tokens must be unreachable from every session,
-- including the firm's own staff. Status metadata must still be visible,
-- and only for the caller's own firm.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE v_a UUID; v_b UUID; v_ua UUID := gen_random_uuid(); v_sa UUID;
BEGIN
    SELECT id INTO v_a FROM crm.tenants WHERE slug = 'genzdatalabs';
    v_b := crm.provision_tenant('Other Firm', 'other-conn', 'OC');

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_ua, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'conn@a.test', '', now(), now(), now());
    INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role)
    VALUES (v_a, v_ua, 'Con', 'Nector', 'conn@a.test', 'super_user')
    RETURNING id INTO v_sa;

    -- Both firms connected; ciphertext stands in for the real thing.
    INSERT INTO crm.tenant_connections (tenant_id, provider, account_email, account_name,
        access_token_enc, refresh_token_enc, expires_at, scopes, connected_by)
    VALUES
      (v_a, 'microsoft', 'info@a.test', 'Firm A Inbox', 'v1.enc.a', 'v1.enc.ra', now() + interval '1 hour',
       ARRAY['offline_access','Files.ReadWrite.All','Mail.Send'], v_sa),
      (v_b, 'google', 'office@b.test', NULL, 'v1.enc.b', 'v1.enc.rb', now() + interval '1 hour',
       ARRAY['https://www.googleapis.com/auth/drive.file'], NULL);

    PERFORM set_config('t.ua', v_ua::text, false);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('t.ua'), 'role', 'authenticated')::text, true);

DO $$
DECLARE n INT; r RECORD;
BEGIN
    -- The table itself: nothing, not even the caller's own row.
    BEGIN
        SELECT count(*) INTO n FROM crm.tenant_connections;
        IF n <> 0 THEN RAISE EXCEPTION 'LEAK: staff can read % connection rows', n; END IF;
    EXCEPTION WHEN insufficient_privilege THEN
        NULL; -- denied outright is also acceptable
    END;

    -- Status: exactly the caller's firm, no token columns exist to leak.
    SELECT count(*) INTO n FROM crm.connection_status();
    IF n <> 1 THEN RAISE EXCEPTION 'connection_status returned % rows, expected 1', n; END IF;

    SELECT * INTO r FROM crm.connection_status();
    IF r.account_email <> 'info@a.test' THEN
        RAISE EXCEPTION 'LEAK: status shows another firm''s account %', r.account_email;
    END IF;
    IF NOT r.can_store_files OR NOT r.can_send_mail THEN
        RAISE EXCEPTION 'capability flags wrong: files=% mail=%', r.can_store_files, r.can_send_mail;
    END IF;

    -- A firm that only granted Drive must not be reported as able to send mail.
    -- (checked from the other side below)
END $$;

RESET ROLE;

-- Firm B's grant covers files only.
DO $$
DECLARE v_ub UUID := gen_random_uuid(); v_b UUID;
BEGIN
    SELECT id INTO v_b FROM crm.tenants WHERE slug = 'other-conn';
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES (v_ub, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'conn@b.test', '', now(), now(), now());
    INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role)
    VALUES (v_b, v_ub, 'Bee', 'Firm', 'conn@b.test', 'super_user');
    PERFORM set_config('t.ub', v_ub::text, false);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
       json_build_object('sub', current_setting('t.ub'), 'role', 'authenticated')::text, true);

DO $$
DECLARE r RECORD;
BEGIN
    SELECT * INTO r FROM crm.connection_status();
    IF r.account_email <> 'office@b.test' THEN
        RAISE EXCEPTION 'LEAK: firm B sees %', r.account_email;
    END IF;
    IF r.can_send_mail THEN
        RAISE EXCEPTION 'drive-only grant reported as able to send mail';
    END IF;
    IF NOT r.can_store_files THEN
        RAISE EXCEPTION 'drive.file grant not recognised as file storage';
    END IF;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE NOTICE 'ALL TENANT CONNECTION CHECKS PASSED'; END $$;
ROLLBACK;
