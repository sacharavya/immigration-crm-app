/**
 * Application-layer source of truth for the role/permission model.
 *
 * Mirrors crm.staff_can() in 20260501000003_user_management.sql, which is
 * the database-layer source of truth used by RLS. Keep them in sync when
 * the role defaults change — there's no automated cross-check.
 */

export type Role =
  | "super_user"
  | "admin"
  | "rcic"
  | "document_officer"
  | "reception"
  | "readonly"
  // Legacy enum values still present in crm.staff_role. No production
  // rows currently carry these; they're handled defensively as
  // zero-permission so that any forgotten row fails closed.
  | "paralegal"
  | "staff";

export type Permission =
  | "view_dashboard"
  | "view_cases"
  | "create_cases"
  | "edit_cases"
  | "delete_cases"
  | "advance_phase"
  | "view_clients"
  | "create_clients"
  | "edit_clients"
  | "delete_clients"
  | "view_documents"
  | "upload_documents"
  | "review_documents"
  | "view_communications"
  | "create_communications"
  | "view_tasks"
  | "manage_tasks"
  | "view_financials"
  | "record_payments"
  | "edit_invoices"
  | "view_intake_form"
  | "edit_intake_form"
  | "view_audit_log"
  | "view_reports"
  | "manage_staff"
  | "manage_super_users"
  | "manage_admins"
  | "reset_passwords"
  | "export_data"
  | "change_system_settings"
  | "manage_templates"
  | "delete_checklists"
  // RET-1: retainer agreement + signature management.
  | "manage_retainers"
  | "void_retainers"
  | "manage_own_signature"
  // APPT-1: appointments module. Mirrors crm.staff_can() in
  // 20260528000001_appointments_module.sql. super_user + admin + rcic +
  // reception have it; document_officer + readonly do not.
  | "manage_appointments"
  // APPT-1 / APPT-6: appointment types + booking settings. super_user +
  // admin only — no per-role allowlist entry needed (admin inherits via
  // NOT-IN catch-all; super_user via ALL).
  | "manage_settings"
  // APPT-8: accept/reject Interac e-transfer proofs for paid consultations.
  // super_user + admin + rcic + reception have it (mirrors crm.staff_can in
  // 20260531000004_paid_consult_tables.sql). document_officer + readonly do
  // not.
  | "review_payments"
  // AGENT-1: referral agent / partner directory. Mirrors crm.staff_can() in
  // 20260625000007_referral_agents.sql. view_agents: super_user + admin + rcic
  // + reception. manage_agents: super_user + admin only (rcic/reception can see
  // referral sources but not edit the directory).
  | "view_agents"
  | "manage_agents";

export type StaffWithOverrides = {
  id: string;
  role: Role;
  first_name: string;
  last_name: string;
  email: string;
  permission_overrides: Record<string, boolean>;
  // Optional because most call sites only need identity + permissions for
  // staffCan(); the layout is the one consumer that actually reads this.
  password_reset_required_at?: string | null;
};

const ALL_PERMISSIONS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "delete_cases",
  "advance_phase",
  "view_clients",
  "create_clients",
  "edit_clients",
  "delete_clients",
  "view_documents",
  "upload_documents",
  "review_documents",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_financials",
  "record_payments",
  "edit_invoices",
  "view_intake_form",
  "edit_intake_form",
  "view_audit_log",
  "view_reports",
  "manage_staff",
  "manage_super_users",
  "manage_admins",
  "reset_passwords",
  "export_data",
  "change_system_settings",
  "manage_templates",
  "delete_checklists",
  "manage_retainers",
  "void_retainers",
  "manage_own_signature",
  "manage_appointments",
  "manage_settings",
  "review_payments",
  "view_agents",
  "manage_agents",
];

const ADMIN_DENIED: ReadonlySet<Permission> = new Set([
  "manage_super_users",
  "manage_admins",
  "change_system_settings",
  // PERM-1: delete authority is super_user only.
  "delete_cases",
  "delete_clients",
  "delete_checklists",
]);

const RCIC_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "advance_phase",
  "view_clients",
  "create_clients",
  "edit_clients",
  "view_documents",
  "upload_documents",
  "review_documents",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_financials",
  "record_payments",
  "edit_invoices",
  "view_intake_form",
  "edit_intake_form",
  "manage_templates",
  "manage_retainers",
  "void_retainers",
  "manage_own_signature",
  "manage_appointments",
  "review_payments",
  "view_agents",
];

const DOCUMENT_OFFICER_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "create_cases",
  "edit_cases",
  "view_clients",
  "edit_clients",
  "view_documents",
  "upload_documents",
  // No review_documents — approval is reserved for admin + RCIC so the
  // officer can't sign off on their own uploads. Mirrors the SQL
  // staff_can() update in 20260509000002_restrict_doc_review_to_admin_rcic.sql.
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_tasks",
  "view_intake_form",
  "edit_intake_form",
];

const RECEPTION_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "view_clients",
  "create_clients",
  "view_communications",
  "create_communications",
  "view_tasks",
  "manage_appointments",
  "review_payments",
];

const READONLY_PERMS: ReadonlyArray<Permission> = [
  "view_dashboard",
  "view_cases",
  "view_clients",
  "view_documents",
  "view_communications",
  "view_tasks",
  "view_financials",
  "view_intake_form",
];

export const ROLE_PERMISSIONS: Readonly<
  Record<Role, ReadonlySet<Permission>>
> = {
  super_user: new Set<Permission>(ALL_PERMISSIONS),
  admin: new Set<Permission>(
    ALL_PERMISSIONS.filter((p) => !ADMIN_DENIED.has(p)),
  ),
  rcic: new Set<Permission>(RCIC_PERMS),
  document_officer: new Set<Permission>(DOCUMENT_OFFICER_PERMS),
  reception: new Set<Permission>(RECEPTION_PERMS),
  readonly: new Set<Permission>(READONLY_PERMS),
  // Legacy roles default to zero permissions — fail closed.
  paralegal: new Set<Permission>(),
  staff: new Set<Permission>(),
};

/**
 * Permissions that CANNOT be overridden per-staff under any circumstances.
 * Even if `permission_overrides` JSONB carries `delete_cases: true` on an
 * admin row, staffCan() ignores it and falls through to the role default
 * (which is FALSE for everyone except super_user). Mirrors the same guard
 * in crm.staff_can() so RLS and app-layer checks agree.
 */
export const NON_OVERRIDABLE_PERMISSIONS: ReadonlySet<Permission> = new Set([
  "delete_cases",
  "delete_clients",
  "delete_checklists",
]);

/**
 * Permissions a super_user or admin can override per-staff via the
 * permission_overrides JSONB. Anything not listed here is role-only —
 * trying to set it in the JSON has no effect. The destructive delete_*
 * permissions are deliberately excluded; see NON_OVERRIDABLE_PERMISSIONS.
 */
export const PERMISSION_OVERRIDABLE: ReadonlySet<Permission> = new Set([
  "view_financials",
  "export_data",
  "review_documents",
]);

export function staffCan(
  staff: StaffWithOverrides,
  permission: Permission,
): boolean {
  // Non-overridable destructive permissions: ignore overrides entirely.
  if (NON_OVERRIDABLE_PERMISSIONS.has(permission)) {
    return ROLE_PERMISSIONS[staff.role].has(permission);
  }
  if (PERMISSION_OVERRIDABLE.has(permission)) {
    const override = staff.permission_overrides[permission];
    if (typeof override === "boolean") return override;
  }
  return ROLE_PERMISSIONS[staff.role].has(permission);
}

/**
 * Strip a raw permission_overrides object down to only the keys that are
 * actually overridable. Role-only permissions, unknown keys, and the
 * non-overridable delete_* permissions are all dropped before the JSONB is
 * persisted to crm.staff.permission_overrides.
 *
 * Server-side guard for the override-escalation path: crm.staff_can() honors
 * an override only for the keys in PERMISSION_OVERRIDABLE, so a stray override
 * for e.g. record_payments would be ignored at read time anyway — but
 * filtering at the write boundary keeps the stored JSONB clean as
 * defense-in-depth. staffCan() already ignores non-overridable keys on read.
 */
export function sanitizeOverrides(
  raw: Record<string, boolean>,
): Record<string, boolean> {
  const clean: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      typeof value === "boolean" &&
      PERMISSION_OVERRIDABLE.has(key as Permission)
    ) {
      clean[key] = value;
    }
  }
  return clean;
}
