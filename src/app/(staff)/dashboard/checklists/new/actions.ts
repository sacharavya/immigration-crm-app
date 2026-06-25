"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

const createVariantSchema = z
  .object({
    categoryCode: z.string().min(1, "Pick a category"),
    name: z.string().trim().min(1, "Name is required").max(200),
    code: z
      .string()
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores")
      .min(1)
      .max(50),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .nullable()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    typicalDurationDays: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .nullable(),
    starting: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("blank") }),
      z.object({
        kind: z.literal("copy"),
        sourceVariantId: z.string().uuid(),
      }),
    ]),
    effectiveFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  })
  .refine(
    (v) => {
      const today = new Date().toISOString().slice(0, 10);
      return v.effectiveFrom >= today;
    },
    {
      path: ["effectiveFrom"],
      message: "Effective date cannot be in the past",
    },
  );

export type CreateVariantInput = z.input<typeof createVariantSchema>;
export type CreateVariantResult =
  | { ok: true; variantId: string }
  | { error: string };

export async function createVariant(
  input: CreateVariantInput,
): Promise<CreateVariantResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return { error: "You don't have permission to manage templates." };
  }

  const parsed = createVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const {
    categoryCode,
    name,
    code,
    description,
    typicalDurationDays,
    starting,
    effectiveFrom,
  } = parsed.data;

  const supabase = await createClient();

  // Category must exist and be active.
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

  // Pre-flight unique-code check (the DB also enforces it; this gives a
  // friendly inline error rather than a raw constraint violation).
  const { data: existing } = await supabase
    .schema("ref")
    .from("service_types")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  if (existing) {
    return { error: `Code "${code}" already exists` };
  }

  // display_order = max within this category + 10, default 100.
  const { data: orderRow } = await supabase
    .schema("ref")
    .from("service_types")
    .select("display_order")
    .eq("category_code", categoryCode)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = orderRow ? orderRow.display_order + 10 : 100;

  const { data: newVariant, error: variantErr } = await supabase
    .schema("ref")
    .from("service_types")
    .insert({
      code,
      name,
      description,
      typical_duration_days: typicalDurationDays ?? null,
      category_code: categoryCode,
      display_order: displayOrder,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (variantErr || !newVariant) {
    return { error: variantErr?.message ?? "Could not create checklist" };
  }

  const { data: newTemplate, error: tplErr } = await supabase
    .schema("ref")
    .from("service_templates")
    .insert({
      service_type_id: newVariant.id,
      version: 1,
      effective_from: effectiveFrom,
      effective_to: null,
      notes: "Initial version",
      created_by: me.id,
    })
    .select("id")
    .single();
  if (tplErr || !newTemplate) {
    // Rollback the variant so a re-run can succeed cleanly.
    await supabase
      .schema("ref")
      .from("service_types")
      .delete()
      .eq("id", newVariant.id);
    return { error: tplErr?.message ?? "Could not create template" };
  }

  if (starting.kind === "copy") {
    // Resolve the source variant's currently-active template via the SQL
    // helper, then snapshot its rows into the new template.
    const { data: sourceTemplateId } = await supabase
      .schema("ref")
      .rpc("active_template_for_variant", {
        p_service_type_id: starting.sourceVariantId,
      });
    if (!sourceTemplateId) {
      return {
        ok: true,
        variantId: newVariant.id,
      };
    }

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
      const { error: copyErr } = await supabase
        .schema("ref")
        .from("template_documents")
        .insert(
          sourceDocs.map((d) => ({
            service_template_id: newTemplate.id,
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
      if (copyErr) {
        return { error: `Variant created but copy failed: ${copyErr.message}` };
      }
    }
  }

  revalidatePath("/dashboard/checklists");
  return { ok: true, variantId: newVariant.id };
}
