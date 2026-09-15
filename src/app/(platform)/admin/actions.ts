"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { sendEmail } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { staffInviteEmail } from "@/lib/email/templates/staff-invite";
import { getBaseUrl } from "@/lib/email/url";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Mutations for the platform (super admin) portal.
//
// Every one re-checks getPlatformAdmin() rather than trusting the layout
// guard: a server action is a public endpoint, reachable without ever
// rendering the page that hosts it.
//
// Note what is NOT here: nothing reads or writes a firm's clients, cases,
// documents or payments. The operator manages firms, not their data, and
// the database enforces that independently.

type Ok = { ok: true };
type Err = { ok?: false; error: string };
export type AdminResult = Ok | Err;

async function requireAdmin(): Promise<string | null> {
  const admin = await getPlatformAdmin();
  return admin?.auth_user_id ?? null;
}

const slug = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use lowercase letters, numbers and hyphens.",
  );

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug,
  number_prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, "1-8 letters or digits, e.g. BB."),
});

export type CreateTenantInput = z.infer<typeof createSchema>;

export async function createTenant(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Service role: provision_tenant also seeds the settings rows a new firm
  // needs, and is deliberately not grantable to the authenticated role.
  const { error } = await adminClient()
    .schema("crm")
    .rpc("provision_tenant", {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
      p_number_prefix: parsed.data.number_prefix,
    });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: `The handle "${parsed.data.slug}" is already taken.` };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  number_prefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,8}$/, "1-8 letters or digits."),
  status: z.enum(["active", "suspended"]),
  public_host: z
    .string()
    .trim()
    .max(253)
    .regex(
      /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/,
      "Enter a domain like book.firm.com, or leave blank.",
    )
    .nullable()
    .or(z.literal("")),
  admin_notes: z.string().max(4000),
});

export type UpdateTenantInput = z.infer<typeof updateSchema>;

export async function updateTenant(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  // Session client: the platform_admin_manages_tenants policy authorises
  // this, so the database re-checks the caller rather than taking the
  // action's word for it.
  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("tenants")
    .update({
      name: input.name,
      number_prefix: input.number_prefix,
      status: input.status,
      public_host: input.public_host?.trim() || null,
      admin_notes: input.admin_notes,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${input.id}`);
  return { ok: true };
}

const featureSchema = z.object({
  id: z.string().uuid(),
  // key -> enabled. Absent keys fall back to the catalogue default.
  features: z.record(z.string(), z.boolean()),
});

export async function setTenantFeatures(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = featureSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("tenants")
    .update({ features: parsed.data.features })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/tenants/${parsed.data.id}`);
  return { ok: true };
}

const respondSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "declined"]),
  admin_response: z.string().trim().max(5000).nullable().or(z.literal("")),
});

export async function respondToFeedback(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = respondSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  const response = input.admin_response?.trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .schema("platform")
    .from("feedback")
    .update({
      status: input.status,
      admin_response: response,
      responded_at: response ? new Date().toISOString() : null,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/feedback");
  return { ok: true };
}

const featureCatalogueSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,40}$/, "Lowercase letters, digits, underscores."),
  label: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300),
  default_enabled: z.boolean(),
});

export async function upsertFeature(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = featureCatalogueSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("platform")
    .from("features")
    .upsert(parsed.data, { onConflict: "key" });

  if (error) return { error: error.message };

  revalidatePath("/admin/features");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Seeding a firm's first owner
// ---------------------------------------------------------------------------
//
// A newly provisioned firm has no staff, so nobody can sign in to it and set
// it up. This creates that first account: a super_user inside the firm, which
// is the role that can then invite the rest of the team.
//
// Note what this does NOT do for the operator. Creating a staff row for
// someone else grants the operator nothing: they still have no staff row of
// their own, so crm.current_tenant_id() is still NULL for them and the
// firm's data stays unreadable. The operator hands over an account; they do
// not gain one.
//
// The temporary password is returned once so the operator can pass it on,
// and password_reset_required_at is stamped so the owner must replace it
// before reaching any page.

function generateTempPassword(): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let body = "";
  for (const b of bytes) body += charset[b % charset.length];
  // Guarantee a digit, symbol and uppercase so common password policies pass.
  return `${body}!1A`;
}

const ownerSchema = z.object({
  tenant_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
});

export type CreateOwnerInput = z.infer<typeof ownerSchema>;

export type CreateOwnerResult =
  | { ok: true; email: string; tempPassword: string; emailed: boolean }
  | { ok?: false; error: string };

export async function createTenantOwner(
  raw: unknown,
): Promise<CreateOwnerResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = ownerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  const admin = adminClient();

  const { data: tenant } = await admin
    .schema("crm")
    .from("tenants")
    .select("id, name, status")
    .eq("id", input.tenant_id)
    .maybeSingle();

  if (!tenant) return { error: "That firm no longer exists." };

  // A platform admin must not also be firm staff, or they would inherit that
  // firm's data access and the separation this whole design rests on is gone.
  const { data: existingAdmin } = await admin
    .schema("platform")
    .from("admins")
    .select("auth_user_id")
    .eq("email", input.email)
    .maybeSingle();

  if (existingAdmin) {
    return {
      error:
        "That address is a platform admin. Use a different one for the firm owner, " +
        "otherwise the operator account would gain access to this firm's data.",
    };
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
    });

  if (createErr || !created?.user) {
    if (createErr && /already/i.test(createErr.message)) {
      return {
        error: `${input.email} already has an account. One person can belong to one firm, so use a different address.`,
      };
    }
    return { error: createErr?.message ?? "Could not create the account." };
  }

  const { error: insertErr } = await admin
    .schema("crm")
    .from("staff")
    .insert({
      tenant_id: input.tenant_id,
      auth_user_id: created.user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email,
      role: "super_user",
      is_active: true,
      can_be_assigned_cases: true,
      permission_overrides: {},
      password_reset_required_at: new Date().toISOString(),
    });

  if (insertErr) {
    // Roll back, or we leave an auth account with no staff row that nothing
    // in either portal can clean up.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertErr.message };
  }

  // Best-effort welcome email. The password is returned either way so the
  // operator can pass it on if delivery fails.
  let emailed = false;
  try {
    const baseUrl = await getBaseUrl();
    const tpl = staffInviteEmail({
      firstName: input.first_name,
      email: input.email,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    });
    const res = await sendEmail({
      to: input.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    emailed = Boolean(res?.ok);
  } catch {
    emailed = false;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/tenants/${input.tenant_id}`);

  return { ok: true, email: input.email, tempPassword, emailed };
}

// ---------------------------------------------------------------------------
// Administering a firm's member accounts
// ---------------------------------------------------------------------------
//
// Account administration only. Every read below goes through a named
// SECURITY DEFINER function that returns identity and status — never a
// firm's clients, cases or documents, which stay unreadable to the operator
// through the ordinary isolation policies.

export type TenantMember = {
  staff_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  password_reset_required: boolean;
  created_at: string;
};

const memberSchema = z.object({
  staff_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  role: z.enum([
    "super_user",
    "admin",
    "rcic",
    "document_officer",
    "reception",
    "readonly",
  ]),
  is_active: z.boolean(),
});

export async function updateTenantMember(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = memberSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const m = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .schema("platform")
    .rpc("update_tenant_member", {
      p_staff: m.staff_id,
      p_first_name: m.first_name,
      p_last_name: m.last_name,
      p_role: m.role,
      p_is_active: m.is_active,
    });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

export type ResetMemberResult =
  | { ok: true; email: string; tempPassword: string; emailed: boolean }
  | { ok?: false; error: string };

/**
 * Issues a new temporary password for a member and forces them through
 * /reset-password on next sign-in. This is the support path for a firm
 * whose owner is locked out — the one case where nobody inside the firm
 * can fix it themselves.
 */
export async function resetTenantMemberPassword(
  raw: unknown,
): Promise<ResetMemberResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = z.object({ staff_id: z.string().uuid() }).safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };

  // The flag is stamped through the session client, because the function
  // gates on platform.is_admin() and that needs the operator's JWT. Changing
  // the password itself genuinely needs the service role, so both clients
  // appear here, each doing only what it must.
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("platform")
    .rpc("flag_member_password_reset", { p_staff: parsed.data.staff_id });

  const row = (data as { auth_user_id: string; email: string }[] | null)?.[0];
  if (error || !row) {
    return { error: error?.message ?? "No such member." };
  }

  const tempPassword = generateTempPassword();
  const { error: pwErr } = await adminClient().auth.admin.updateUserById(
    row.auth_user_id,
    { password: tempPassword },
  );
  if (pwErr) return { error: pwErr.message };

  let emailed = false;
  try {
    const baseUrl = await getBaseUrl();
    const tpl = passwordResetEmail({
      firstName: row.email.split("@")[0],
      email: row.email,
      tempPassword,
      loginUrl: `${baseUrl}/login`,
    });
    const res = await sendEmail({
      to: row.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });
    emailed = Boolean(res?.ok);
  } catch {
    emailed = false;
  }

  revalidatePath("/admin");
  return { ok: true, email: row.email, tempPassword, emailed };
}

// ---------------------------------------------------------------------------
// Removing a firm
// ---------------------------------------------------------------------------

export type DeletePreviewRow = { table_ref: string; row_count: number };

/** What would be destroyed. Read-only, so it is safe to call on render. */
export async function previewTenantDeletion(
  tenantId: string,
): Promise<{ ok: true; rows: DeletePreviewRow[] } | { ok?: false; error: string }> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("platform")
    .rpc("tenant_delete_preview", { p_tenant: tenantId });

  if (error) return { error: error.message };
  return { ok: true, rows: (data as DeletePreviewRow[] | null) ?? [] };
}

/**
 * Permanently removes a firm and everything it owns.
 *
 * Irreversible, so the caller must type the firm's exact name; the database
 * re-checks that string rather than trusting this action, and refuses if it
 * does not match. The row counts are recorded in platform.deleted_tenants
 * before the data goes, because "it's gone" is not an adequate answer to a
 * later question about what happened to it.
 */
export async function deleteTenant(raw: unknown): Promise<AdminResult> {
  if (!(await requireAdmin())) return { error: "Not authorized" };

  const parsed = z
    .object({
      tenant_id: z.string().uuid(),
      confirm_name: z.string().trim().min(1),
    })
    .safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("platform")
    .rpc("delete_tenant", {
      p_tenant: parsed.data.tenant_id,
      p_confirm_name: parsed.data.confirm_name,
    });

  if (error) return { error: error.message };

  // The firm's rows are gone; their sign-in accounts still exist in Auth.
  // Remove them too, or the addresses stay claimed and nobody could reuse
  // them at another firm.
  const authIds =
    (data as { auth_user_id: string }[] | null)?.map((r) => r.auth_user_id) ?? [];
  const admin = adminClient();
  for (const id of authIds) {
    try {
      await admin.auth.admin.deleteUser(id);
    } catch {
      // Best effort: the tenant data is already gone and committed. A
      // leftover auth account is recoverable; failing here is not.
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}
