-- ============================================================================
-- Platform admin: see and administer a firm's member accounts.
-- ============================================================================
--
-- This deliberately widens the operator's view, so it is worth being precise
-- about where the new line sits.
--
-- Still unreachable: clients, cases, documents, payments, communications,
-- tasks, notes, audit rows. Everything a firm's work actually consists of.
-- The operator has no crm.staff row, so every tenant_isolation policy keeps
-- denying them, and nothing below changes that.
--
-- Now reachable: the firm's member ACCOUNTS — name, email, role, active
-- flag, last login. This is account administration, not case data, and it
-- is what makes support possible: when a firm's only owner is locked out,
-- somebody has to be able to reset that password.
--
-- The access is a narrow, named function rather than a policy on crm.staff,
-- so the surface is explicit and greppable instead of a blanket exemption
-- that could later be widened by accident.

CREATE OR REPLACE FUNCTION platform.tenant_members(p_tenant UUID)
RETURNS TABLE (
    staff_id UUID,
    first_name TEXT,
    last_name TEXT,
    email CITEXT,
    role crm.staff_role,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ,
    password_reset_required BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'platform.tenant_members is restricted to platform admins';
    END IF;

    RETURN QUERY
    SELECT s.id,
           s.first_name,
           s.last_name,
           s.email,
           s.role,
           s.is_active,
           s.last_login_at,
           (s.password_reset_required_at IS NOT NULL),
           s.created_at
      FROM crm.staff s
     WHERE s.tenant_id = p_tenant
       AND s.deleted_at IS NULL
     ORDER BY s.created_at;
END;
$$;

REVOKE ALL ON FUNCTION platform.tenant_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.tenant_members(UUID) TO authenticated, service_role;

-- Change a member's name, role or active flag.
--
-- Guards worth stating: the operator cannot promote an account into the
-- platform admin roster from here, cannot move a member between firms, and
-- cannot deactivate a firm's last active owner — which would lock the firm
-- out of its own data with no way back in.
CREATE OR REPLACE FUNCTION platform.update_tenant_member(
    p_staff UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role crm.staff_role,
    p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID;
    v_was_active BOOLEAN;
    v_was_role crm.staff_role;
    v_remaining INT;
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'update_tenant_member is restricted to platform admins';
    END IF;

    SELECT tenant_id, is_active, role
      INTO v_tenant, v_was_active, v_was_role
      FROM crm.staff
     WHERE id = p_staff AND deleted_at IS NULL;

    IF v_tenant IS NULL THEN
        RAISE EXCEPTION 'No such member.';
    END IF;

    -- Don't let the firm lose its last way in.
    IF (v_was_active AND NOT p_is_active)
       OR (v_was_role = 'super_user' AND p_role <> 'super_user') THEN
        SELECT count(*) INTO v_remaining
          FROM crm.staff
         WHERE tenant_id = v_tenant
           AND deleted_at IS NULL
           AND is_active = TRUE
           AND role = 'super_user'
           AND id <> p_staff;

        IF v_remaining = 0 THEN
            RAISE EXCEPTION
                'This is the firm''s last active owner. Give someone else the '
                'owner role first, or the firm loses access to its own data.';
        END IF;
    END IF;

    UPDATE crm.staff
       SET first_name = p_first_name,
           last_name = p_last_name,
           role = p_role,
           is_active = p_is_active,
           deactivated_at = CASE WHEN p_is_active THEN NULL ELSE now() END
     WHERE id = p_staff;
END;
$$;

REVOKE ALL ON FUNCTION platform.update_tenant_member(UUID, TEXT, TEXT, crm.staff_role, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.update_tenant_member(UUID, TEXT, TEXT, crm.staff_role, BOOLEAN) TO authenticated, service_role;

-- Stamps the forced-reset flag. The password itself is changed through the
-- Auth admin API in the server action; this marks the account so the next
-- sign-in must go through /reset-password before anything else loads.
CREATE OR REPLACE FUNCTION platform.flag_member_password_reset(p_staff UUID)
RETURNS TABLE (auth_user_id UUID, email CITEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT platform.is_admin() THEN
        RAISE EXCEPTION 'flag_member_password_reset is restricted to platform admins';
    END IF;

    RETURN QUERY
    UPDATE crm.staff s
       SET password_reset_required_at = now()
     WHERE s.id = p_staff AND s.deleted_at IS NULL
    RETURNING s.auth_user_id, s.email;
END;
$$;

REVOKE ALL ON FUNCTION platform.flag_member_password_reset(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.flag_member_password_reset(UUID) TO authenticated, service_role;
