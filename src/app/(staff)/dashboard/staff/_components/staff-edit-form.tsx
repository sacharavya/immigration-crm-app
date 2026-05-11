"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  PERMISSION_OVERRIDABLE,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/auth/permissions";
import { ROLES, selectableRoles } from "@/lib/validators/staff";

import { updateStaff } from "../actions";
import { SignatureUploader } from "./signature-uploader";

type EditFormStaff = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  phone: string | null;
  cicc_license_no: string | null;
  is_active: boolean;
  can_be_assigned_cases: boolean;
  permission_overrides: Record<string, boolean>;
  deactivated: boolean;
  is_rcic: boolean;
  rcic_membership_number: string | null;
  office_address: string | null;
  office_phone: string | null;
  cell_phone: string | null;
  signature_image_url: string | null;
  signature_image_set_at: string | null;
  printed_name_for_signature: string | null;
};

const ROLE_LABEL: Record<Role, string> = {
  super_user: "Super User",
  admin: "Admin",
  rcic: "RCIC",
  document_officer: "Document Officer",
  reception: "Reception",
  readonly: "Read-only",
  paralegal: "Paralegal (legacy)",
  staff: "Staff (legacy)",
};

const PERMISSION_LABEL: Record<Permission, string> = {
  view_dashboard: "View dashboard",
  view_cases: "View cases",
  create_cases: "Create cases",
  edit_cases: "Edit cases",
  delete_cases: "Delete cases",
  advance_phase: "Advance phase",
  view_clients: "View clients",
  create_clients: "Create clients",
  edit_clients: "Edit clients",
  delete_clients: "Delete clients",
  view_documents: "View documents",
  upload_documents: "Upload documents",
  review_documents: "Review documents",
  view_communications: "View communications",
  create_communications: "Create communications",
  view_tasks: "View tasks",
  manage_tasks: "Manage tasks",
  view_financials: "View financials",
  record_payments: "Record payments",
  edit_invoices: "Edit invoices",
  view_intake_form: "View intake form",
  edit_intake_form: "Edit intake form",
  view_audit_log: "View audit log",
  view_reports: "View reports",
  manage_staff: "Manage staff",
  manage_super_users: "Manage super users",
  manage_admins: "Manage admins",
  reset_passwords: "Reset passwords",
  export_data: "Export data",
  change_system_settings: "Change system settings",
  manage_templates: "Manage templates",
  delete_checklists: "Delete checklists",
  manage_retainers: "Manage retainers",
  void_retainers: "Void retainers",
  manage_own_signature: "Manage own signature",
};

type OverrideChoice = "default" | "allow" | "deny";

function readChoice(
  overrides: Record<string, boolean>,
  perm: Permission,
): OverrideChoice {
  const v = overrides[perm];
  if (v === true) return "allow";
  if (v === false) return "deny";
  return "default";
}

export function StaffEditForm({
  actorRole,
  staff,
}: {
  actorRole: Role;
  staff: EditFormStaff;
}) {
  const [firstName, setFirstName] = useState(staff.first_name);
  const [lastName, setLastName] = useState(staff.last_name);
  const [role, setRole] = useState<Role>(staff.role);
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [ciccLicense, setCiccLicense] = useState(staff.cicc_license_no ?? "");
  const [isActive, setIsActive] = useState(staff.is_active);
  const [canBeAssigned, setCanBeAssigned] = useState(staff.can_be_assigned_cases);
  const [isRcic, setIsRcic] = useState(staff.is_rcic);
  const [rcicMembership, setRcicMembership] = useState(
    staff.rcic_membership_number ?? "",
  );
  const [officeAddress, setOfficeAddress] = useState(
    staff.office_address ?? "",
  );
  const [officePhone, setOfficePhone] = useState(staff.office_phone ?? "");
  const [cellPhone, setCellPhone] = useState(staff.cell_phone ?? "");
  const [overrideChoices, setOverrideChoices] = useState<
    Record<string, OverrideChoice>
  >(() => {
    const initial: Record<string, OverrideChoice> = {};
    for (const p of PERMISSION_OVERRIDABLE) {
      initial[p] = readChoice(staff.permission_overrides, p);
    }
    return initial;
  });

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const allowedRoles = selectableRoles(actorRole);

  function buildOverrides(): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const [perm, choice] of Object.entries(overrideChoices)) {
      if (choice === "allow") out[perm] = true;
      if (choice === "deny") out[perm] = false;
      // "default" → key omitted
    }
    return out;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const payload = {
      first_name: firstName,
      last_name: lastName,
      role,
      phone,
      cicc_license_no: ciccLicense,
      is_active: isActive,
      can_be_assigned_cases: canBeAssigned,
      permission_overrides: buildOverrides(),
      is_rcic: isRcic,
      rcic_membership_number: isRcic ? rcicMembership : "",
      office_address: officeAddress,
      office_phone: officePhone,
      cell_phone: cellPhone,
    };

    startTransition(async () => {
      const result = await updateStaff(staff.id, payload);
      if ("error" in result) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Profile</h2>
            {staff.deactivated && (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                Deactivated
              </span>
            )}
          </div>

          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="first_name">First name</FieldLabel>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.first_name)}
                  required
                />
                {fieldErrors.first_name && (
                  <FieldError
                    errors={fieldErrors.first_name.map((m) => ({
                      message: m,
                    }))}
                  />
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="last_name">Last name</FieldLabel>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.last_name)}
                  required
                />
                {fieldErrors.last_name && (
                  <FieldError
                    errors={fieldErrors.last_name.map((m) => ({ message: m }))}
                  />
                )}
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                value={staff.email}
                readOnly
                disabled
                className="bg-stone-100"
              />
              <FieldDescription>
                Read-only. Auth identity is bound to this address.
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/30"
                >
                  {ROLES.filter((r) => allowedRoles.includes(r) || r === role).map(
                    (r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ),
                  )}
                </select>
                {fieldErrors.role && (
                  <FieldError
                    errors={fieldErrors.role.map((m) => ({ message: m }))}
                  />
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
            </div>

            {role === "rcic" && (
              <Field>
                <FieldLabel htmlFor="cicc_license_no">
                  CICC license #
                </FieldLabel>
                <Input
                  id="cicc_license_no"
                  value={ciccLicense}
                  onChange={(e) => setCiccLicense(e.target.value)}
                />
              </Field>
            )}

            <div className="flex flex-col gap-2 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={canBeAssigned}
                  onChange={(e) => setCanBeAssigned(e.target.checked)}
                />
                <span>Can be assigned to cases</span>
              </label>
              <p className="text-xs text-stone-500">
                Inactive staff stay in the system but cannot sign in.
                Un-checking &ldquo;Can be assigned&rdquo; hides this user from
                case assignment dropdowns without removing them.
              </p>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold">RCIC details</h2>
            <p className="text-sm text-stone-500">
              When this staff member is flagged as an RCIC, their membership
              number and contact details flow onto the retainer agreement.
              Leave blank for non-RCIC staff.
            </p>
          </div>

          <FieldGroup>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isRcic}
                onChange={(e) => setIsRcic(e.target.checked)}
              />
              <span>This staff member is an RCIC</span>
            </label>

            {isRcic && (
              <>
                <Field>
                  <FieldLabel htmlFor="rcic_membership_number">
                    CICC membership number
                  </FieldLabel>
                  <Input
                    id="rcic_membership_number"
                    value={rcicMembership}
                    onChange={(e) => setRcicMembership(e.target.value)}
                    placeholder="e.g. R711181"
                    aria-invalid={Boolean(fieldErrors.rcic_membership_number)}
                  />
                  {fieldErrors.rcic_membership_number && (
                    <FieldError
                      errors={fieldErrors.rcic_membership_number.map((m) => ({
                        message: m,
                      }))}
                    />
                  )}
                </Field>

                <SignatureUploader
                  staffId={staff.id}
                  defaultPrintedName={`${staff.first_name} ${staff.last_name}`.trim()}
                  current={{
                    imageUrl: staff.signature_image_url,
                    setAt: staff.signature_image_set_at,
                    printedName: staff.printed_name_for_signature,
                  }}
                />
              </>
            )}

            <Field>
              <FieldLabel htmlFor="office_address">Office address</FieldLabel>
              <Input
                id="office_address"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                placeholder="e.g. 211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="office_phone">Office phone</FieldLabel>
                <Input
                  id="office_phone"
                  value={officePhone}
                  onChange={(e) => setOfficePhone(e.target.value)}
                  placeholder="e.g. 416-386-5351"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cell_phone">Cell phone</FieldLabel>
                <Input
                  id="cell_phone"
                  value={cellPhone}
                  onChange={(e) => setCellPhone(e.target.value)}
                  placeholder="e.g. (647) 687-9540"
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold">Permission overrides</h2>
            <p className="text-sm text-stone-500">
              Override the role default for the listed permissions. Anything
              not in this list is governed by role only.
            </p>
          </div>

          <ul className="divide-y divide-stone-100">
            {Array.from(PERMISSION_OVERRIDABLE).map((perm) => {
              const defaultAllowed = ROLE_PERMISSIONS[role].has(perm);
              const choice = overrideChoices[perm] ?? "default";
              return (
                <li key={perm} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {PERMISSION_LABEL[perm]}
                    </span>
                    <span className="text-xs text-stone-500">
                      Role default: {defaultAllowed ? "allowed" : "denied"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {(["default", "allow", "deny"] as const).map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="radio"
                          name={`override_${perm}`}
                          checked={choice === opt}
                          onChange={() =>
                            setOverrideChoices((s) => ({ ...s, [perm]: opt }))
                          }
                        />
                        <span>
                          {opt === "default"
                            ? `Use role default (${defaultAllowed ? "allowed" : "denied"})`
                            : opt === "allow"
                              ? "Always allow"
                              : "Always deny"}
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {savedAt && !error && (
          <span className="text-xs text-green-700">Saved.</span>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
