"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { sendEmail } from "@/lib/email/client";
import { agentInviteEmail } from "@/lib/email/templates/agent-invite";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { getBaseUrl } from "@/lib/email/url";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addAgentSchema, updateAgentSchema } from "@/lib/validators/agent";

// ---------- helpers ---------------------------------------------------------

function generateTempPassword(): string {
  const charset =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  let body = "";
  for (const b of bytes) body += charset[b % charset.length];
  return `${body}!1A`;
}

async function requireManager(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const me = await getStaff();
  if (!me) return { ok: false, error: "Not authenticated" };
  if (!staffCan(me, "manage_agents")) {
    return { ok: false, error: "You don't have permission to manage agents." };
  }
  return { ok: true };
}

// ---------- 1. addAgent -----------------------------------------------------

export type AddAgentResult =
  | {
      ok: true;
      agentId: string;
      tempPassword: string;
      emailSent: boolean;
      emailError?: string;
    }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function addAgent(payload: unknown): Promise<AddAgentResult> {
  const parsed = addAgentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_agents")) {
    return { error: "You don't have permission to manage agents." };
  }

  const tempPassword = generateTempPassword();
  const admin = adminClient();

  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email: parsed.data.email,
      password: tempPassword,
      email_confirm: true,
    },
  );
  if (createErr || !created.user) {
    return { error: createErr?.message ?? "Could not create auth user" };
  }

  const supabase = await createClient();
  const { data: newAgent, error: insertErr } = await supabase
    .schema("crm")
    .from("referral_agents")
    .insert({
      auth_user_id: created.user.id,
      name: parsed.data.name,
      organization: parsed.data.organization ?? null,
      agent_type: parsed.data.agent_type,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      country_code: parsed.data.country_code ?? null,
      commission_terms: parsed.data.commission_terms ?? null,
      notes: parsed.data.notes ?? null,
      is_active: true,
      created_by: me.id,
      password_reset_required_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !newAgent) {
    // Roll back the auth user so we don't leak an account with no agent row.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertErr?.message ?? "Could not create agent row" };
  }

  const baseUrl = await getBaseUrl();
  const tpl = agentInviteEmail({
    name: parsed.data.name,
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

  revalidatePath("/dashboard/agents");
  return {
    ok: true,
    agentId: newAgent.id,
    tempPassword,
    emailSent: emailRes.ok,
    emailError: emailRes.ok ? undefined : emailRes.error,
  };
}

// ---------- 2. updateAgent --------------------------------------------------

export type UpdateAgentResult =
  | { ok: true }
  | { error: string; fieldErrors?: Record<string, string[]> };

export async function updateAgent(
  agentId: string,
  payload: unknown,
): Promise<UpdateAgentResult> {
  if (!z.string().uuid().safeParse(agentId).success) {
    return { error: "Invalid agent id" };
  }
  const parsed = updateAgentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const guard = await requireManager();
  if (!guard.ok) return { error: guard.error };

  const supabase = await createClient();
  const { error: updateErr } = await supabase
    .schema("crm")
    .from("referral_agents")
    .update({
      name: parsed.data.name,
      organization: parsed.data.organization ?? null,
      agent_type: parsed.data.agent_type,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      country_code: parsed.data.country_code ?? null,
      commission_terms: parsed.data.commission_terms ?? null,
      notes: parsed.data.notes ?? null,
    })
    .eq("id", agentId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/agents/${agentId}`);
  return { ok: true };
}

// ---------- 3. deactivateAgent ----------------------------------------------

export async function deactivateAgent(
  agentId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(agentId).success) {
    return { error: "Invalid agent id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_agents")) {
    return { error: "You don't have permission to manage agents." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("referral_agents")
    .select("id, auth_user_id, deleted_at")
    .eq("id", agentId)
    .maybeSingle();
  if (!target) return { error: "Agent not found" };
  if (target.deleted_at) return { error: "Agent already deactivated" };

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .schema("crm")
    .from("referral_agents")
    .update({
      deleted_at: now,
      deactivated_at: now,
      deactivated_by: me.id,
      is_active: false,
    })
    .eq("id", agentId);
  if (updateErr) return { error: updateErr.message };

  // Invalidate existing sessions: ban the auth user. Mirrors deactivateStaff.
  if (target.auth_user_id) {
    try {
      const admin = adminClient();
      await admin.auth.admin.updateUserById(target.auth_user_id, {
        ban_duration: "876000h",
      });
    } catch (err) {
      console.error(
        `[deactivateAgent] could not ban auth user ${target.auth_user_id}:`,
        err,
      );
    }
  }

  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/agents/${agentId}`);
  return { ok: true };
}

// ---------- 4. reactivateAgent ----------------------------------------------

export async function reactivateAgent(
  agentId: string,
): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(agentId).success) {
    return { error: "Invalid agent id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_agents")) {
    return { error: "You don't have permission to manage agents." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("referral_agents")
    .select("id, auth_user_id")
    .eq("id", agentId)
    .maybeSingle();
  if (!target) return { error: "Agent not found" };

  const { error: updateErr } = await supabase
    .schema("crm")
    .from("referral_agents")
    .update({
      deleted_at: null,
      deactivated_at: null,
      deactivated_by: null,
      is_active: true,
    })
    .eq("id", agentId);
  if (updateErr) return { error: updateErr.message };

  if (target.auth_user_id) {
    try {
      const admin = adminClient();
      await admin.auth.admin.updateUserById(target.auth_user_id, {
        ban_duration: "none",
      });
    } catch (err) {
      console.error(
        `[reactivateAgent] could not unban auth user ${target.auth_user_id}:`,
        err,
      );
    }
  }

  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/agents/${agentId}`);
  return { ok: true };
}

// ---------- 5. resetAgentPassword -------------------------------------------

export type ResetAgentPasswordResult =
  | { ok: true; tempPassword: string; emailSent: boolean; emailError?: string }
  | { error: string };

export async function resetAgentPassword(
  agentId: string,
): Promise<ResetAgentPasswordResult> {
  if (!z.string().uuid().safeParse(agentId).success) {
    return { error: "Invalid agent id" };
  }

  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  // Reuse the staff reset_passwords gate; managing agents implies it for
  // super_user/admin, but check the dedicated permission for parity.
  if (!staffCan(me, "manage_agents")) {
    return { error: "You don't have permission to manage agents." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .schema("crm")
    .from("referral_agents")
    .select("id, auth_user_id, name, email, deleted_at")
    .eq("id", agentId)
    .maybeSingle();
  if (!target) return { error: "Agent not found" };
  if (target.deleted_at) {
    return { error: "Cannot reset password for a deactivated agent." };
  }
  if (!target.auth_user_id || !target.email) {
    return { error: "This agent has no login to reset." };
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
    .from("referral_agents")
    .update({ password_reset_required_at: new Date().toISOString() })
    .eq("id", agentId);

  const baseUrl = await getBaseUrl();
  const tpl = passwordResetEmail({
    firstName: target.name,
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

  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/agents/${agentId}`);
  return {
    ok: true,
    tempPassword,
    emailSent: emailRes.ok,
    emailError: emailRes.ok ? undefined : emailRes.error,
  };
}
