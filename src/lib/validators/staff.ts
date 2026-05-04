import { z } from "zod";

import type { Role } from "@/lib/auth/permissions";

export const ROLES = [
  "super_user",
  "admin",
  "rcic",
  "document_officer",
  "reception",
  "readonly",
] as const;

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      // FormData.get returns null when a field isn't rendered (e.g. the
      // cicc_license_no field when role !== 'rcic'). Treat null and empty
      // strings the same as "absent" so optional validation passes.
      if (v === null || v === undefined) return undefined;
      if (typeof v === "string" && v.trim() === "") return undefined;
      return v;
    },
    z
      .string()
      .max(max, `${label} cannot exceed ${max} characters`)
      .optional(),
  );

export const addStaffSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().email("Enter a valid email"),
  role: z.enum(ROLES, { message: "Pick a role" }),
  phone: optionalText(50, "Phone"),
  cicc_license_no: optionalText(50, "CICC license"),
});

export type AddStaffInput = z.infer<typeof addStaffSchema>;

export const updateStaffSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required").max(100),
    last_name: z.string().trim().min(1, "Last name is required").max(100),
    role: z.enum(ROLES, { message: "Pick a role" }),
    phone: optionalText(50, "Phone"),
    cicc_license_no: optionalText(50, "CICC license"),
    is_active: z.boolean(),
    can_be_assigned_cases: z.boolean(),
    permission_overrides: z.record(z.string(), z.boolean()).default({}),
    // RCIC fields — only meaningful when is_rcic=true. The DB also
    // enforces "rcic_membership_number requires is_rcic" via CHECK
    // constraint; we pre-empt that here with a refinement so the UI
    // returns a helpful Zod error instead of a raw Postgres message.
    is_rcic: z.boolean().default(false),
    rcic_membership_number: optionalText(50, "Membership number"),
    office_address: optionalText(300, "Office address"),
    office_phone: optionalText(50, "Office phone"),
    cell_phone: optionalText(50, "Cell phone"),
  })
  .refine(
    (v) => v.is_rcic || !v.rcic_membership_number,
    {
      path: ["rcic_membership_number"],
      message: "Only RCICs may have a membership number.",
    },
  );

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

/**
 * Whether `actor` can create / edit / deactivate a staff member with
 * `target` role. Mirrors the rules in actions.ts; centralised so the UI
 * can hide options the actor wouldn't be allowed to choose.
 */
export function canActOnRole(actor: Role, target: Role): boolean {
  if (actor === "super_user") return true;
  if (actor === "admin") return target !== "super_user" && target !== "admin";
  return false;
}

/** Roles `actor` may invite or assign to a target. */
export function selectableRoles(actor: Role): Role[] {
  return ROLES.filter((r) => canActOnRole(actor, r));
}
