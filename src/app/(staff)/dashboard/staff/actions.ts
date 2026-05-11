"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan, type Role } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/client";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { staffInviteEmail } from "@/lib/email/templates/staff-invite";
import { getBaseUrl } from "@/lib/email/url";
import { createClient } from "@/lib/supabase/server";
import {
  addStaffSchema,
  canActOnRole,
  updateStaffSchema,
} from "@/lib/validators/staff";

// ---------- helpers ---------------------------------------------------------

type Actor = {
  id: string;
  role: Role;
  permission_overrides: Record<string, boolean>;
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function generateTempPassword(): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let body = "";
  for (const b of bytes) body += charset[b % charset.length];
  // Guarantee one digit + symbol + uppercase to clear common policies.
  return `${body}!1A`;
}

async function loadActor(): Promise<
  { ok: true; actor: Actor } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: row } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, role, permission_overrides")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row) return { ok: false, error: "Active staff record not found" };

  return {
    ok: true,
    actor: {
      id: row.id,
      role: row.role as Role,
      permission_overrides:
        (row.permission_overrides as Record<string, boolean> | null) ?? {},
    },
  };
}

// ---------- 1. addStaff -----------------------------------------------------

export type AddStaffResult =
  | {
      ok: true;
      staffId: string;
      tempPassword: string;
      emailSent: boolean;
      emailError?: string;
    }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function addStaff(
  payload: unknown,
): Promise<AddStaffResult> {
  const parsed = addStaffSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  if (!staffCan(
    {
      id: actor.id,
      role: actor.role,
      first_name: "",
      last_name: "",
      email: "",
      permission_overrides: actor.permission_overrides,
    },
    "manage_staff",
  )) {
    return { error: "You don't have permission to manage staff." };
  }

  const target = parsed.data.role;
  if (!canActOnRole(actor.role, target)) {
    return {
      error: `You cannot create users with role "${target}".`,
    };
  }

  const tempPassword = generateTempPassword();
  const admin = adminClient();

  const {
    data: created,
    error: createErr,
  } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return { error: createErr?.message ?? "Could not create auth user" };
  }

  const supabase = await createClient();
  const { data: newStaff, error: insertErr } = await supabase
    .schema("crm")
    .from("staff")
    .insert({
      auth_user_id: created.user.id,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
      cicc_license_no: parsed.data.cicc_license_no ?? null,
      is_active: true,
      can_be_assigned_cases: true,
      permission_overrides: {},
      created_by_staff: actor.id,
      password_reset_required_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !newStaff) {
    // Roll back the auth user; otherwise we'd leak an account that has
    // no matching staff row and can't be cleaned up via the UI.
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error: insertErr?.message ?? "Could not create staff row",
    };
  }

  // Best-effort welcome email. The dialog still surfaces tempPassword
  // so the admin has a fallback if delivery fails or is delayed.
  const baseUrl = await getBaseUrl();
  const tpl = staffInviteEmail({
    firstName: parsed.data.first_name,
    email: parsed.data.email,
    tempPassword,
    loginUrl: `${baseUrl}/login`,
  });
  const emailRes = await sendEmail({
    to: parsed.data.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  revalidatePath("/dashboard/staff");
  return {
    ok: true,
    staffId: newStaff.id,
    tempPassword,
    emailSent: emailRes.ok,
    emailError: emailRes.ok ? undefined : emailRes.error,
  };
}

// ---------- 2. updateStaff --------------------------------------------------

export type UpdateStaffResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function updateStaff(
  staffId: string,
  payload: unknown,
): Promise<UpdateStaffResult> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }
  const parsed = updateStaffSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  if (!staffCan(
    {
      id: actor.id,
      role: actor.role,
      first_name: "",
      last_name: "",
      email: "",
      permission_overrides: actor.permission_overrides,
    },
    "manage_staff",
  )) {
    return { error: "You don't have permission to manage staff." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, role")
    .eq("id", staffId)
    .maybeSingle();
  if (!existing) return { error: "Staff not found" };

  const currentRole = existing.role as Role;
  const nextRole = parsed.data.role;

  // Admins cannot edit other admins/super_users, nor promote to those.
  if (!canActOnRole(actor.role, currentRole)) {
    return {
      error: `Your role cannot edit users with role "${currentRole}".`,
    };
  }
  if (!canActOnRole(actor.role, nextRole)) {
    return {
      error: `Your role cannot promote staff to "${nextRole}".`,
    };
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
      cicc_license_no: parsed.data.cicc_license_no ?? null,
      is_active: parsed.data.is_active,
      can_be_assigned_cases: parsed.data.can_be_assigned_cases,
      permission_overrides: parsed.data.permission_overrides,
      is_rcic: parsed.data.is_rcic,
      rcic_membership_number: parsed.data.is_rcic
        ? parsed.data.rcic_membership_number || null
        : null,
      office_address: parsed.data.office_address ?? null,
      office_phone: parsed.data.office_phone ?? null,
      cell_phone: parsed.data.cell_phone ?? null,
    })
    .eq("id", staffId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return { ok: true };
}

// ---------- 3. deactivateStaff ----------------------------------------------

export async function deactivateStaff(
  staffId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  if (!staffCan(
    {
      id: actor.id,
      role: actor.role,
      first_name: "",
      last_name: "",
      email: "",
      permission_overrides: actor.permission_overrides,
    },
    "manage_staff",
  )) {
    return { error: "You don't have permission to manage staff." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, auth_user_id, role, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!target) return { error: "Staff not found" };
  if (target.deleted_at) return { error: "Staff already deactivated" };

  const targetRole = target.role as Role;

  if (!canActOnRole(actor.role, targetRole)) {
    return { error: "You cannot deactivate this user's role." };
  }

  if (target.id === actor.id && actor.role === "super_user") {
    const { count } = await supabase
      .schema("crm")
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_user")
      .is("deleted_at", null)
      .eq("is_active", true);
    if ((count ?? 0) <= 1) {
      return { error: "Cannot deactivate the only active super user." };
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      deleted_at: now,
      deactivated_at: now,
      deactivated_by: actor.id,
      is_active: false,
    })
    .eq("id", staffId);
  if (updateErr) return { error: updateErr.message };

  // Active sessions: ban the auth user so existing JWTs and refresh tokens
  // are rejected at the next request. Supabase doesn't expose a "sign-out
  // by user id" admin API; updateUserById with ban_duration is the
  // documented way to invalidate sessions.
  try {
    const admin = adminClient();
    await admin.auth.admin.updateUserById(target.auth_user_id, {
      ban_duration: "876000h",
    });
  } catch (err) {
    console.error(
      `[deactivateStaff] could not ban auth user ${target.auth_user_id}:`,
      err,
    );
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return { ok: true };
}

// ---------- 4. reactivateStaff ----------------------------------------------

export async function reactivateStaff(
  staffId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  if (!staffCan(
    {
      id: actor.id,
      role: actor.role,
      first_name: "",
      last_name: "",
      email: "",
      permission_overrides: actor.permission_overrides,
    },
    "manage_staff",
  )) {
    return { error: "You don't have permission to manage staff." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, auth_user_id, role, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!target) return { error: "Staff not found" };

  if (!canActOnRole(actor.role, target.role as Role)) {
    return { error: "You cannot reactivate this user's role." };
  }

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      deleted_at: null,
      deactivated_at: null,
      deactivated_by: null,
      is_active: true,
    })
    .eq("id", staffId);
  if (updateErr) return { error: updateErr.message };

  try {
    const admin = adminClient();
    await admin.auth.admin.updateUserById(target.auth_user_id, {
      ban_duration: "none",
    });
  } catch (err) {
    console.error(
      `[reactivateStaff] could not unban auth user ${target.auth_user_id}:`,
      err,
    );
  }

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return { ok: true };
}

// ---------- 5. resetStaffPassword -------------------------------------------

export type ResetStaffPasswordResult =
  | {
      ok: true;
      tempPassword: string;
      emailSent: boolean;
      emailError?: string;
    }
  | { error: string };

export async function resetStaffPassword(
  staffId: string,
): Promise<ResetStaffPasswordResult> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  if (!staffCan(
    {
      id: actor.id,
      role: actor.role,
      first_name: "",
      last_name: "",
      email: "",
      permission_overrides: actor.permission_overrides,
    },
    "reset_passwords",
  )) {
    return { error: "You don't have permission to reset passwords." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, auth_user_id, role, first_name, email, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!target) return { error: "Staff not found" };
  if (target.deleted_at) {
    return { error: "Cannot reset password for a deactivated user." };
  }

  if (!canActOnRole(actor.role, target.role as Role)) {
    return {
      error: "Your role cannot reset this user's password.",
    };
  }

  const tempPassword = generateTempPassword();
  const admin = adminClient();

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    target.auth_user_id,
    { password: tempPassword },
  );
  if (updateErr) return { error: updateErr.message };

  await supabase
    .schema("crm")
    .from("staff")
    .update({ password_reset_required_at: new Date().toISOString() })
    .eq("id", staffId);

  const baseUrl = await getBaseUrl();
  const tpl = passwordResetEmail({
    firstName: target.first_name,
    email: target.email,
    tempPassword,
    loginUrl: `${baseUrl}/login`,
  });
  const emailRes = await sendEmail({
    to: target.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return {
    ok: true,
    tempPassword,
    emailSent: emailRes.ok,
    emailError: emailRes.ok ? undefined : emailRes.error,
  };
}

// ---------- 6. setStaffSignature -------------------------------------------

const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024;
const SIGNATURE_ACCEPTED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/heic",
]);

const setSignatureSchema = z.object({
  imageDataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpeg|jpg|heic);base64,/i,
      "Image must be a PNG/JPEG/HEIC data URL",
    ),
  printedName: z.string().trim().min(1, "Printed name is required").max(200),
});

// Sets a staff member's signature image. Allowed if the actor has
// manage_staff OR is updating their own row.
export async function setStaffSignature(
  staffId: string,
  input: z.input<typeof setSignatureSchema>,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  const isSelf = actor.id === staffId;
  if (!isSelf) {
    const canManage = staffCan(
      {
        id: actor.id,
        role: actor.role,
        first_name: "",
        last_name: "",
        email: "",
        permission_overrides: actor.permission_overrides,
      },
      "manage_staff",
    );
    if (!canManage) {
      return { error: "You don't have permission to update this signature." };
    }
  }

  const parsed = setSignatureSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const match = parsed.data.imageDataUrl.match(
    /^data:(image\/[a-z]+);base64,(.*)$/i,
  );
  if (!match) return { error: "Could not parse signature image" };
  const mimeType = match[1].toLowerCase();
  if (!SIGNATURE_ACCEPTED_MIME.has(mimeType)) {
    return { error: `Unsupported image type: ${mimeType}` };
  }
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > SIGNATURE_MAX_BYTES) {
    return { error: "Signature image must be under 2 MB" };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, role, is_rcic, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!target) return { error: "Staff not found" };
  if (target.deleted_at) {
    return { error: "Cannot edit a deactivated staff member." };
  }
  if (!isSelf && !canActOnRole(actor.role, target.role as Role)) {
    return { error: "Your role cannot edit this staff member." };
  }

  const { error } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      signature_image_url: parsed.data.imageDataUrl,
      signature_image_set_at: new Date().toISOString(),
      printed_name_for_signature: parsed.data.printedName,
      signature_capture_method: "uploaded",
    })
    .eq("id", staffId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return { ok: true };
}

// ---------- 7. removeStaffSignature ----------------------------------------

export async function removeStaffSignature(
  staffId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(staffId).success) {
    return { error: "Invalid staff id" };
  }

  const a = await loadActor();
  if (!a.ok) return { error: a.error };
  const actor = a.actor;

  const isSelf = actor.id === staffId;
  if (!isSelf) {
    const canManage = staffCan(
      {
        id: actor.id,
        role: actor.role,
        first_name: "",
        last_name: "",
        email: "",
        permission_overrides: actor.permission_overrides,
      },
      "manage_staff",
    );
    if (!canManage) {
      return { error: "You don't have permission to update this signature." };
    }
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, role, deleted_at")
    .eq("id", staffId)
    .maybeSingle();
  if (!target) return { error: "Staff not found" };
  if (target.deleted_at) {
    return { error: "Cannot edit a deactivated staff member." };
  }
  if (!isSelf && !canActOnRole(actor.role, target.role as Role)) {
    return { error: "Your role cannot edit this staff member." };
  }

  const { error } = await supabase
    .schema("crm")
    .from("staff")
    .update({
      signature_image_url: null,
      signature_image_set_at: null,
      printed_name_for_signature: null,
      signature_capture_method: null,
    })
    .eq("id", staffId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/staff");
  revalidatePath(`/dashboard/staff/${staffId}`);
  return { ok: true };
}
