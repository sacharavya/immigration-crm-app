-- ============================================================================
-- Per-firm branding: a firm uploads its own logo.
-- ============================================================================
--
-- Until now every surface showed the platform's mark, so a firm's own staff
-- and — more importantly — a firm's clients on the upload, payment and
-- signing portals saw somebody else's brand. This is the first piece of
-- moving firm identity out of hardcoded strings and into the tenant row.

ALTER TABLE crm.tenants
    ADD COLUMN logo_url TEXT,
    ADD COLUMN logo_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN crm.tenants.logo_url IS
    'Public URL of the firm''s uploaded logo in the branding bucket. NULL '
    'falls back to the platform mark.';

-- ---------------------------------------------------------------------------
-- The bucket
-- ---------------------------------------------------------------------------
--
-- Public read: a logo is shown on unauthenticated pages (the client upload
-- portal, signing pages), so a signed URL would mean minting one per render
-- for an asset that is on the firm's public website anyway.
--
-- 2MB is far more than a logo needs and keeps a stray hero image out.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding',
    'branding',
    TRUE,
    2 * 1024 * 1024,
    -- SVG is deliberately excluded. It can carry script, and it would be
    -- served from the storage origin; raster formats cannot.
    ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Who may write what
-- ---------------------------------------------------------------------------
--
-- Objects are keyed <tenant_id>/<filename>, and the first path segment must
-- equal the writer's own tenant. That mirrors the row-level isolation in the
-- database: one firm cannot overwrite another firm's logo even though they
-- share a bucket.

CREATE POLICY "branding: public read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'branding');

CREATE POLICY "branding: firm writes its own folder"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = crm.current_tenant_id()::text
        AND crm.staff_can(auth.uid(), 'manage_settings')
    );

CREATE POLICY "branding: firm updates its own folder"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = crm.current_tenant_id()::text
        AND crm.staff_can(auth.uid(), 'manage_settings')
    );

CREATE POLICY "branding: firm deletes its own folder"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = crm.current_tenant_id()::text
        AND crm.staff_can(auth.uid(), 'manage_settings')
    );

-- ---------------------------------------------------------------------------
-- Writing the logo back to the tenant row
-- ---------------------------------------------------------------------------
--
-- Firm staff hold only SELECT on crm.tenants: name, slug, status, features
-- and the commercial fields are the platform's to set, not the firm's. So a
-- plain UPDATE from the app matched zero rows and, because that is not an
-- error in PostgREST, the upload reported success while the brand never
-- changed.
--
-- Rather than widen the table's policies — RLS cannot restrict which columns
-- a policy exposes, so that would also hand the firm its own status and slug
-- — this function is the one narrow door: it touches the two branding
-- columns and nothing else, and re-checks the permission itself.

CREATE OR REPLACE FUNCTION crm.set_tenant_logo(p_logo_url TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant UUID := crm.current_tenant_id();
BEGIN
    IF v_tenant IS NULL THEN
        RAISE EXCEPTION 'set_tenant_logo: no firm in scope.';
    END IF;
    IF NOT crm.staff_can(auth.uid(), 'manage_settings') THEN
        RAISE EXCEPTION 'set_tenant_logo: requires the manage_settings permission.';
    END IF;

    UPDATE crm.tenants
       SET logo_url = p_logo_url,
           logo_updated_at = CASE WHEN p_logo_url IS NULL THEN NULL ELSE now() END
     WHERE id = v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION crm.set_tenant_logo(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.set_tenant_logo(TEXT) TO authenticated, service_role;
