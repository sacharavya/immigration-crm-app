"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getPlatformAdmin } from "@/lib/auth/platform-admin";
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
