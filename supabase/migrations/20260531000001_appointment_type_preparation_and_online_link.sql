-- ============================================================================
-- APPT-6: extend appointment_types + appointment_settings to support the new
-- staff-facing management pages.
--
--   * crm.appointment_types.preparation_notes — longer-form "what to expect"
--     content. Shown on the public booking page after type selection AND on
--     the staff appointment detail dialog so the assigned RCIC can prep
--     before meetings. Optional, plain text.
--
--   * crm.appointment_settings.default_online_link — a firm-wide default
--     Teams/Zoom link. The APPT-6 settings UI exposes the field; per-
--     appointment overrides still take precedence in the booking flow.
--
-- Both columns are additive + nullable so old rows + old code paths keep
-- working untouched.
-- ============================================================================

ALTER TABLE crm.appointment_types
    ADD COLUMN IF NOT EXISTS preparation_notes TEXT;

COMMENT ON COLUMN crm.appointment_types.preparation_notes IS
    'Longer-form "what to expect" content shown on the public booking page '
    'after type selection AND on staff appointment detail pages to help the '
    'assigned RCIC prepare. Optional. Plain text or simple markdown (bullet '
    'lists, paragraphs).';

ALTER TABLE crm.appointment_settings
    ADD COLUMN IF NOT EXISTS default_online_link TEXT;

COMMENT ON COLUMN crm.appointment_settings.default_online_link IS
    'Optional firm-wide default link for online appointments (e.g., a '
    'standing Teams/Zoom room). Used when no per-appointment link is set. '
    'Staff can override per appointment in the new-appointment dialog.';
