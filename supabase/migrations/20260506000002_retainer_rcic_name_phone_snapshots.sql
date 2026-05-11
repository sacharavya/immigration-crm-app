-- =========================================================================
-- Section 14 of the retainer ("Contact Information") shows the RCIC's
-- given name, family name, office phone, and cell phone separately —
-- not the combined "rcic_name" + "rcic_phone" we already snapshot.
--
-- Split snapshot columns so the contact card locks in the actual
-- per-staff fields at sign time, matching what's displayed in the doc.
-- =========================================================================

ALTER TABLE crm.retainer_agreements
  ADD COLUMN rcic_given_name_at_signing  TEXT,
  ADD COLUMN rcic_family_name_at_signing TEXT,
  ADD COLUMN rcic_office_phone_at_signing TEXT,
  ADD COLUMN rcic_cell_phone_at_signing   TEXT;

COMMENT ON COLUMN crm.retainer_agreements.rcic_given_name_at_signing IS
  'Snapshot of crm.staff.first_name at send time. Renders into Section 14 (Contact Information) of the retainer.';

COMMENT ON COLUMN crm.retainer_agreements.rcic_office_phone_at_signing IS
  'Snapshot of crm.staff.office_phone at send time. The existing rcic_phone_at_signing column collapses cell-or-office into one value; this column preserves the office line specifically.';
