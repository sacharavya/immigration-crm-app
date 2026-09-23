-- Demo accounts for the trial stack. Passwords are in docker/README.md.
-- Users are written straight into GoTrue's tables the way its admin API
-- would, so no service needs to be called during init.
DO $$
DECLARE
  v_admin  UUID := '00000000-0000-4000-8000-000000000001';
  v_staff  UUID := '00000000-0000-4000-8000-000000000002';
  v_tenant UUID;
BEGIN
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated', 'admin@casebind.local',
     crypt('CaseBind-Admin-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_staff, 'authenticated', 'authenticated', 'demo@bigbang.local',
     crypt('CaseBind-Demo-2026', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_admin, v_admin::text, jsonb_build_object('sub', v_admin::text, 'email', 'admin@casebind.local', 'email_verified', true), 'email', now(), now(), now()),
    (gen_random_uuid(), v_staff, v_staff::text, jsonb_build_object('sub', v_staff::text, 'email', 'demo@bigbang.local', 'email_verified', true), 'email', now(), now(), now());

  -- The operator: no crm.staff row, so no tenant, so no access to any firm's data.
  INSERT INTO platform.admins (auth_user_id, email, full_name, is_active)
  VALUES (v_admin, 'admin@casebind.local', 'Platform Admin', true);

  -- One firm and its first super user.
  INSERT INTO crm.tenants (name, slug, number_prefix)
  VALUES ('Big Bang Immigration', 'big-bang-immigration', 'BB')
  RETURNING id INTO v_tenant;

  INSERT INTO crm.staff (tenant_id, auth_user_id, first_name, last_name, email, role, is_active)
  VALUES (v_tenant, v_staff, 'Demo', 'User', 'demo@bigbang.local', 'super_user', true);
END $$;
