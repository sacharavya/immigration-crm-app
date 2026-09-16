"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaffTenantId } from "@/lib/tenant/context";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ChecklistGroupUpdate = Database["ref"]["Tables"]["checklist_groups"]["Update"];
type ServiceCategoryUpdate =
  Database["ref"]["Tables"]["service_categories"]["Update"];

// ---------------------------------------------------------------------------
// Server actions for /dashboard/checklists.
//
// All actions:
//   - re-validate `manage_templates` (UI gate is informational; this is the
//     enforcement layer per CLAUDE.md's three-layer pattern)
//   - Zod-parse input
//   - mutate via the cookie-based Supabase client (RLS is the third layer)
//   - revalidatePath on success
// audit.log_change triggers on ref.checklist_groups capture every write.
// ---------------------------------------------------------------------------

type ActionResult<T = void> = T extends void
  ? { ok: true } | { error: string }
  : ({ ok: true } & T) | { error: string };

const REVALIDATE_PATH = "/dashboard/checklists";

async function gate(): Promise<
  | { ok: true; me: NonNullable<Awaited<ReturnType<typeof getStaff>>> }
  | { ok: false; error: string }
> {
  const me = await getStaff();
  if (!me) return { ok: false, error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { ok: false, error: "You don't have permission to manage templates." };
  }
  return { ok: true, me };
}

// ---------------------------------------------------------------------------
// createChecklistGroup
// ---------------------------------------------------------------------------

const groupCreateSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only")
    .min(1)
    .max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : (v ?? null))),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export type CreateChecklistGroupInput = z.input<typeof groupCreateSchema>;
export type CreateChecklistGroupResult = ActionResult;

export async function createChecklistGroup(
  input: CreateChecklistGroupInput,
): Promise<CreateChecklistGroupResult> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = groupCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { code, name, description } = parsed.data;
  let displayOrder = parsed.data.displayOrder;

  const supabase = await createClient();

  // Pre-check unique code so we can give a friendly error rather than
  // surface the raw unique-violation from Postgres.
  const { data: existing } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (existing) return { error: "Group code already exists" };

  if (displayOrder === undefined) {
    const { data: maxRow } = await supabase
      .schema("ref")
      .from("checklist_groups")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    displayOrder = (maxRow?.display_order ?? 0) + 10;
  }

  const { error } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .insert({
      tenant_id: await requireStaffTenantId(),
      code,
      name,
      description,
      display_order: displayOrder,
      is_active: true,
      created_by: g.me.id,
    });

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// updateChecklistGroup
// ---------------------------------------------------------------------------

const groupUpdateSchema = z.object({
  groupCode: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export type UpdateChecklistGroupInput = z.input<typeof groupUpdateSchema>;
export type UpdateChecklistGroupResult = ActionResult;

export async function updateChecklistGroup(
  input: UpdateChecklistGroupInput,
): Promise<UpdateChecklistGroupResult> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = groupUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { groupCode, name, description, displayOrder } = parsed.data;
  const updates: ChecklistGroupUpdate = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (displayOrder !== undefined) updates.display_order = displayOrder;

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .update(updates)
    .eq("code", groupCode);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deactivateChecklistGroup / reactivateChecklistGroup
// ---------------------------------------------------------------------------

async function setGroupActive(
  groupCode: string,
  active: boolean,
): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();

  if (!active) {
    // Refuse if any template_documents reference this group.
    const { count } = await supabase
      .schema("ref")
      .from("template_documents")
      .select("id", { count: "exact", head: true })
      .eq("group_code", groupCode);
    if ((count ?? 0) > 0) {
      return {
        error: `Cannot deactivate group: in use by ${count} template${count === 1 ? "" : "s"}`,
      };
    }
  }

  const { error } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .update({ is_active: active })
    .eq("code", groupCode);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deactivateChecklistGroup(
  groupCode: string,
): Promise<ActionResult> {
  return setGroupActive(groupCode, false);
}

export async function reactivateChecklistGroup(
  groupCode: string,
): Promise<ActionResult> {
  return setGroupActive(groupCode, true);
}

// ---------------------------------------------------------------------------
// deleteChecklistGroup
// ---------------------------------------------------------------------------

export async function deleteChecklistGroup(
  groupCode: string,
): Promise<ActionResult> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();

  // Refuse if any templates reference this group, active or not.
  const { count } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("id", { count: "exact", head: true })
    .eq("group_code", groupCode);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete group: in use by ${count} template${count === 1 ? "" : "s"}`,
    };
  }

  const { error } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .delete()
    .eq("code", groupCode);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// createChecklist
//
// Single-step replacement for the multi-step wizard. Same insert logic as
// /dashboard/checklists/new/actions.ts:createVariant, plus the new
// sub_category field. The wizard at /new/ is left in place as a fallback.
// ---------------------------------------------------------------------------

const createChecklistSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    code: z
      .string()
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores")
      .min(1)
      .max(50),
    categoryCode: z.string().min(1, "Pick a category"),
    subCategory: z
      .string()
      .trim()
      .max(200)
      .optional()
      .nullable()
      .transform((v) => (v === undefined || v === "" ? null : v)),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    starting: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("blank") }),
      z.object({
        kind: z.literal("copy"),
        sourceVariantId: z.string().uuid(),
      }),
    ]),
  })
  .refine((v) => v.effectiveFrom >= new Date().toISOString().slice(0, 10), {
    path: ["effectiveFrom"],
    message: "Effective date cannot be in the past",
  });

export type CreateChecklistInput = z.input<typeof createChecklistSchema>;
export type CreateChecklistResult =
  | { ok: true; checklistId: string }
  | { error: string };

export async function createChecklist(
  input: CreateChecklistInput,
): Promise<CreateChecklistResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { error: "You don't have permission to manage templates." };
  }

  const parsed = createChecklistSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const {
    name,
    code,
    categoryCode,
    subCategory,
    effectiveFrom,
    starting,
  } = parsed.data;

  const supabase = await createClient();

  const { data: category } = await supabase
    .schema("ref")
    .from("service_categories")
    .select("code, is_active")
    .eq("code", categoryCode)
    .maybeSingle();
  if (!category) return { error: "Category not found" };
  if (!category.is_active) {
    return { error: "Category is deactivated. Pick another." };
  }

  const { data: existing } = await supabase
    .schema("ref")
    .from("service_types")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existing) return { error: `Code "${code}" already exists` };

  const { data: orderRow } = await supabase
    .schema("ref")
    .from("service_types")
    .select("display_order")
    .eq("category_code", categoryCode)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = orderRow ? orderRow.display_order + 10 : 100;

  const { data: newRow, error: insertErr } = await supabase
    .schema("ref")
    .from("service_types")
    .insert({
      tenant_id: await requireStaffTenantId(),
      code,
      name,
      category_code: categoryCode,
      sub_category: subCategory,
      display_order: displayOrder,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (insertErr || !newRow) {
    return { error: insertErr?.message ?? "Could not create checklist" };
  }

  const { data: newTpl, error: tplErr } = await supabase
    .schema("ref")
    .from("service_templates")
    .insert({
      tenant_id: await requireStaffTenantId(),
      service_type_id: newRow.id,
      version: 1,
      effective_from: effectiveFrom,
      effective_to: null,
      notes: "Initial version",
      created_by: me.id,
    })
    .select("id")
    .single();
  if (tplErr || !newTpl) {
    await supabase
      .schema("ref")
      .from("service_types")
      .delete()
      .eq("id", newRow.id);
    return { error: tplErr?.message ?? "Could not create template" };
  }

  if (starting.kind === "copy") {
    const { data: sourceTemplateId } = await supabase
      .schema("ref")
      .rpc("active_template_for_variant", {
        p_service_type_id: starting.sourceVariantId,
      });
    if (sourceTemplateId) {
      const { data: sourceDocs } = await supabase
        .schema("ref")
        .from("template_documents")
        .select(
          `
            document_code,
            document_label,
            group_code,
            condition_label,
            notes,
            display_order,
            allowed_file_types,
            max_file_size_mb,
            instructions,
            expected_quantity,
            allows_multiple
          `,
        )
        .eq("service_template_id", sourceTemplateId);

      if (sourceDocs && sourceDocs.length > 0) {
        // Resolved once: await cannot live inside the map callback below.
        const tenantId = await requireStaffTenantId();
        await supabase
          .schema("ref")
          .from("template_documents")
          .insert(
            sourceDocs.map((d) => ({
              tenant_id: tenantId,
              service_template_id: newTpl.id,
              document_code: d.document_code,
              document_label: d.document_label,
              group_code: d.group_code,
              condition_label: d.condition_label,
              notes: d.notes,
              display_order: d.display_order,
              allowed_file_types: d.allowed_file_types,
              max_file_size_mb: d.max_file_size_mb,
              instructions: d.instructions,
              expected_quantity: d.expected_quantity,
              allows_multiple: d.allows_multiple,
            })),
          );
      }
    }
  }

  revalidatePath(REVALIDATE_PATH);
  return { ok: true, checklistId: newRow.id };
}

// ---------------------------------------------------------------------------
// Category CRUD
//
// Categories are user-created (seeded categories were stripped in MC-7's
// migration). The landing page itself owns the create / edit / delete
// interactions; there's no separate admin section.
// ---------------------------------------------------------------------------

const categoryCreateSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores")
    .min(1)
    .max(50),
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === undefined || v === "" ? null : v)),
});

export type CreateCategoryInput = z.input<typeof categoryCreateSchema>;
export type CreateCategoryResult =
  | { ok: true; category: { code: string; name: string } }
  | { error: string };

export async function createCategory(
  input: CreateCategoryInput,
): Promise<CreateCategoryResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { error: "You don't have permission to manage templates." };
  }

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { code, name, description } = parsed.data;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .schema("ref")
    .from("service_categories")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (existing) return { error: `Category code "${code}" already exists` };

  const { data: maxRow } = await supabase
    .schema("ref")
    .from("service_categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = (maxRow?.display_order ?? 0) + 10;

  const { error } = await supabase
    .schema("ref")
    .from("service_categories")
    .insert({
      code,
      name,
      description,
      display_order: displayOrder,
      is_active: true,
    });

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true, category: { code, name } };
}

const categoryUpdateSchema = z.object({
  categoryCode: z.string().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  displayOrder: z.coerce.number().int().min(0).max(10000).optional(),
});

export type UpdateCategoryInput = z.input<typeof categoryUpdateSchema>;
export type UpdateCategoryResult = { ok: true } | { error: string };

export async function updateCategory(
  input: UpdateCategoryInput,
): Promise<UpdateCategoryResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { error: "You don't have permission to manage templates." };
  }

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { categoryCode, name, description, displayOrder } = parsed.data;

  const updates: ServiceCategoryUpdate = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (displayOrder !== undefined) updates.display_order = displayOrder;
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_categories")
    .update(updates)
    .eq("code", categoryCode);
  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}

export async function deleteCategory(
  categoryCode: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { error: "You don't have permission to manage templates." };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .schema("ref")
    .from("service_types")
    .select("id", { count: "exact", head: true })
    .eq("category_code", categoryCode);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete: ${count} checklist${count === 1 ? "" : "s"} in this category.`,
    };
  }

  const { error } = await supabase
    .schema("ref")
    .from("service_categories")
    .delete()
    .eq("code", categoryCode);
  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { ok: true };
}
