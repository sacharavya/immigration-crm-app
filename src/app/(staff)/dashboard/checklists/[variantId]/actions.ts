"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type TemplateDocUpdate =
  Database["ref"]["Tables"]["template_documents"]["Update"];
type ServiceTypeUpdate = Database["ref"]["Tables"]["service_types"]["Update"];

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const ALLOWED_FILE_TYPES_SET = new Set<string>(ALLOWED_FILE_TYPES);

async function gate() {
  const me = await getStaff();
  if (!me) return { ok: false as const, error: "Not authenticated" };
  if (!staffCan(me, "manage_templates")) {
    return {
      ok: false as const,
      error: "You don't have permission to manage templates.",
    };
  }
  return { ok: true as const, me };
}

function rev(variantId: string) {
  revalidatePath(`/dashboard/checklists/${variantId}`);
}

async function templateIsPast(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: string,
): Promise<{ past: boolean; serviceTypeId: string | null; error?: string }> {
  const { data, error } = await supabase
    .schema("ref")
    .from("service_templates")
    .select("service_type_id, effective_to")
    .eq("id", templateId)
    .maybeSingle();
  if (error || !data) {
    return { past: false, serviceTypeId: null, error: "Template not found" };
  }
  const today = new Date().toISOString().slice(0, 10);
  const past = data.effective_to !== null && data.effective_to < today;
  return { past, serviceTypeId: data.service_type_id };
}

// ---------------------------------------------------------------------------
// updateVariant
// ---------------------------------------------------------------------------

const updateVariantSchema = z.object({
  variantId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  typicalDurationDays: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .nullable(),
  subCategory: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
});

export async function updateVariant(
  input: z.input<typeof updateVariantSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = updateVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { variantId, name, description, typicalDurationDays, subCategory } =
    parsed.data;
  const updates: ServiceTypeUpdate = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (typicalDurationDays !== undefined) {
    updates.typical_duration_days = typicalDurationDays;
  }
  if (subCategory !== undefined) updates.sub_category = subCategory;
  if (Object.keys(updates).length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .update(updates)
    .eq("id", variantId);
  if (error) return { error: error.message };

  rev(variantId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// createNewVersion
// ---------------------------------------------------------------------------

const createVersionSchema = z.object({
  variantId: z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional().nullable(),
  copyFromCurrentActive: z.boolean().default(true),
});

export async function createNewVersion(
  input: z.input<typeof createVersionSchema>,
): Promise<{ ok: true; templateId: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = createVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variantId, effectiveFrom, notes, copyFromCurrentActive } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  if (effectiveFrom < today) {
    return { error: "Effective date cannot be in the past" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .schema("ref")
    .from("service_templates")
    .select("id, version, effective_from, effective_to")
    .eq("service_type_id", variantId)
    .order("version", { ascending: false });
  const nextVersion = (existing?.[0]?.version ?? 0) + 1;

  // Pick the currently-active template to (a) clip its effective_to if the
  // new version starts today, and (b) optionally copy items from.
  const activeNow = (existing ?? []).find(
    (t) =>
      t.effective_from <= today &&
      (t.effective_to === null || t.effective_to >= today),
  );

  const { data: newTpl, error: insErr } = await supabase
    .schema("ref")
    .from("service_templates")
    .insert({
      service_type_id: variantId,
      version: nextVersion,
      effective_from: effectiveFrom,
      effective_to: null,
      notes: notes ?? null,
      created_by: g.me.id,
    })
    .select("id")
    .single();
  if (insErr || !newTpl) {
    return { error: insErr?.message ?? "Could not create version" };
  }

  // Clip the previously-active version if the new one starts today.
  // TODO(v2): a daily job should also clip versions whose successor's
  // effective_from has just been crossed, so audit reads cleanly even
  // without a request flowing through this action.
  if (activeNow && effectiveFrom <= today) {
    const dayBefore = new Date(`${effectiveFrom}T00:00:00Z`);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    const dayBeforeIso = dayBefore.toISOString().slice(0, 10);
    await supabase
      .schema("ref")
      .from("service_templates")
      .update({ effective_to: dayBeforeIso })
      .eq("id", activeNow.id);
  }

  if (copyFromCurrentActive && activeNow) {
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
          expected_quantity
        `,
      )
      .eq("service_template_id", activeNow.id);

    if (sourceDocs && sourceDocs.length > 0) {
      await supabase
        .schema("ref")
        .from("template_documents")
        .insert(
          sourceDocs.map((d) => ({
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
          })),
        );
    }
  }

  rev(variantId);
  return { ok: true, templateId: newTpl.id };
}

// ---------------------------------------------------------------------------
// Item actions: update / add / remove / reorder
// ---------------------------------------------------------------------------

const updateDocSchema = z.object({
  templateDocumentId: z.string().uuid(),
  label: z.string().trim().min(1).max(300).optional(),
  conditionLabel: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  allowedFileTypes: z
    .array(z.enum(ALLOWED_FILE_TYPES))
    .optional()
    .nullable()
    .transform((v) =>
      v === undefined ? undefined : v && v.length === 0 ? null : v,
    ),
  maxFileSizeMb: z.coerce.number().int().min(1).max(4).optional().nullable(),
  expectedQuantity: z.coerce.number().int().min(1).max(50).optional(),
  instructions: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
});

export async function updateTemplateDocument(
  input: z.input<typeof updateDocSchema>,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = updateDocSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  if (v.allowedFileTypes) {
    for (const t of v.allowedFileTypes) {
      if (!ALLOWED_FILE_TYPES_SET.has(t)) {
        return { error: `Unsupported file type: ${t}` };
      }
    }
  }

  const supabase = await createClient();

  const { data: doc } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("service_template_id")
    .eq("id", v.templateDocumentId)
    .maybeSingle();
  if (!doc) return { error: "Template item not found" };

  const tpl = await templateIsPast(supabase, doc.service_template_id);
  if (tpl.error) return { error: tpl.error };
  if (tpl.past) {
    return { error: "Past versions are read-only. Create a new version." };
  }

  const updates: TemplateDocUpdate = {};
  if (v.label !== undefined) updates.document_label = v.label;
  if (v.conditionLabel !== undefined) updates.condition_label = v.conditionLabel;
  if (v.allowedFileTypes !== undefined) updates.allowed_file_types = v.allowedFileTypes;
  if (v.maxFileSizeMb !== undefined) updates.max_file_size_mb = v.maxFileSizeMb;
  if (v.expectedQuantity !== undefined) updates.expected_quantity = v.expectedQuantity;
  if (v.instructions !== undefined) updates.instructions = v.instructions;

  if (Object.keys(updates).length === 0) return { ok: true };

  const { error } = await supabase
    .schema("ref")
    .from("template_documents")
    .update(updates)
    .eq("id", v.templateDocumentId);
  if (error) return { error: error.message };

  if (tpl.serviceTypeId) rev(tpl.serviceTypeId);
  return { ok: true };
}

const addDocSchema = z.object({
  templateId: z.string().uuid(),
  groupCode: z.string().min(1),
  label: z.string().trim().min(1).max(300),
  documentCode: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/)
    .min(1)
    .max(50),
});

export async function addTemplateDocument(
  input: z.input<typeof addDocSchema>,
): Promise<{ ok: true; id: string } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const parsed = addDocSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { templateId, groupCode, label, documentCode } = parsed.data;

  const supabase = await createClient();
  const tpl = await templateIsPast(supabase, templateId);
  if (tpl.error) return { error: tpl.error };
  if (tpl.past) {
    return { error: "Past versions are read-only. Create a new version." };
  }

  const { data: maxRow } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("display_order")
    .eq("service_template_id", templateId)
    .eq("group_code", groupCode)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const displayOrder = (maxRow?.display_order ?? 90) + 10;

  const { data, error } = await supabase
    .schema("ref")
    .from("template_documents")
    .insert({
      service_template_id: templateId,
      group_code: groupCode,
      document_code: documentCode,
      document_label: label,
      display_order: displayOrder,
      expected_quantity: 1,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not add item" };
  }

  if (tpl.serviceTypeId) rev(tpl.serviceTypeId);
  return { ok: true, id: data.id };
}

export async function removeTemplateDocument(
  templateDocumentId: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();

  const { data: doc } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("service_template_id")
    .eq("id", templateDocumentId)
    .maybeSingle();
  if (!doc) return { error: "Template item not found" };

  const tpl = await templateIsPast(supabase, doc.service_template_id);
  if (tpl.error) return { error: tpl.error };
  if (tpl.past) {
    return { error: "Past versions are read-only. Create a new version." };
  }

  // Refuse if any in-flight cases use this template version.
  const { count } = await supabase
    .schema("crm")
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("service_template_id", doc.service_template_id)
    .neq("status", "closed")
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot remove this item: ${count} in-flight case${count === 1 ? "" : "s"} use this version. Create a new version instead.`,
    };
  }

  const { error } = await supabase
    .schema("ref")
    .from("template_documents")
    .delete()
    .eq("id", templateDocumentId);
  if (error) return { error: error.message };

  if (tpl.serviceTypeId) rev(tpl.serviceTypeId);
  return { ok: true };
}

export async function reorderTemplateDocuments(
  templateId: string,
  orderedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const tpl = await templateIsPast(supabase, templateId);
  if (tpl.error) return { error: tpl.error };
  if (tpl.past) {
    return { error: "Past versions are read-only." };
  }

  // Sequential update of display_order. Postgres doesn't have native bulk
  // case-when via PostgREST, so a loop is the simplest correct approach.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .schema("ref")
      .from("template_documents")
      .update({ display_order: (i + 1) * 10 })
      .eq("id", orderedIds[i])
      .eq("service_template_id", templateId);
    if (error) return { error: error.message };
  }

  if (tpl.serviceTypeId) rev(tpl.serviceTypeId);
  return { ok: true };
}

export async function removeGroupFromTemplate(
  templateId: string,
  groupCode: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const tpl = await templateIsPast(supabase, templateId);
  if (tpl.error) return { error: tpl.error };
  if (tpl.past) {
    return { error: "Past versions are read-only." };
  }

  // Refuse if in-flight cases reference this template version.
  const { count } = await supabase
    .schema("crm")
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("service_template_id", templateId)
    .neq("status", "closed")
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot remove items: ${count} in-flight case${count === 1 ? "" : "s"} use this version. Create a new version instead.`,
    };
  }

  const { error } = await supabase
    .schema("ref")
    .from("template_documents")
    .delete()
    .eq("service_template_id", templateId)
    .eq("group_code", groupCode);
  if (error) return { error: error.message };

  if (tpl.serviceTypeId) rev(tpl.serviceTypeId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Variant lifecycle: schedule / cancel / deactivate / reactivate
// ---------------------------------------------------------------------------

export async function scheduleDeactivation(
  variantId: string,
  deactivateOn: string,
  reason: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const today = new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deactivateOn) || deactivateOn <= today) {
    return { error: "Deactivation date must be in the future" };
  }
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "Reason is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .update({
      scheduled_deactivation_at: `${deactivateOn}T00:00:00Z`,
      deactivation_reason: trimmedReason,
      deactivated_by: g.me.id,
    })
    .eq("id", variantId);
  if (error) return { error: error.message };

  rev(variantId);
  return { ok: true };
}

export async function cancelScheduledDeactivation(
  variantId: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .update({
      scheduled_deactivation_at: null,
      deactivation_reason: null,
      deactivated_by: null,
    })
    .eq("id", variantId);
  if (error) return { error: error.message };

  rev(variantId);
  return { ok: true };
}

export async function deactivateNow(
  variantId: string,
  reason: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { error: "Reason is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .update({
      deactivated_at: new Date().toISOString(),
      deactivation_reason: trimmedReason,
      deactivated_by: g.me.id,
    })
    .eq("id", variantId);
  if (error) return { error: error.message };

  rev(variantId);
  return { ok: true };
}

export async function reactivateVariant(
  variantId: string,
): Promise<{ ok: true } | { error: string }> {
  const g = await gate();
  if (!g.ok) return { error: g.error };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .update({
      deactivated_at: null,
      scheduled_deactivation_at: null,
      deactivation_reason: null,
      deactivated_by: null,
    })
    .eq("id", variantId);
  if (error) return { error: error.message };

  rev(variantId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// deleteChecklist (PERM-1)
//
// Hard delete the variant + its templates + their template_documents.
// super_user only — gated here and by the ref.service_types_delete /
// service_templates_delete RLS policies from 20260502000007.
//
// Refused if ANY case (open, closed, or soft-deleted) still references
// this checklist. The crm.cases.service_template_id and service_type_id
// FKs have no ON DELETE behavior, so any surviving row blocks the
// service_templates delete and the FK error surfaces against
// service_types instead. The user must hard-delete those cases first.
// ---------------------------------------------------------------------------

export async function deleteChecklist(
  variantId: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };
  if (!staffCan(me, "delete_checklists")) {
    return { error: "Only a super user can delete a checklist." };
  }

  const supabase = await createClient();

  const { count } = await supabase
    .schema("crm")
    .from("cases")
    .select("id", { count: "exact", head: true })
    .eq("service_type_id", variantId);
  if ((count ?? 0) > 0) {
    return {
      error: `Cannot delete: ${count} case${count === 1 ? "" : "s"} (including closed and archived) reference this checklist. Hard-delete those cases first, or deactivate the checklist instead.`,
    };
  }

  // template_documents cascade from service_templates (ON DELETE CASCADE in
  // migration 001). service_templates → service_types does not cascade, so
  // delete templates first, then the service_types row.
  const { error: tplError } = await supabase
    .schema("ref")
    .from("service_templates")
    .delete()
    .eq("service_type_id", variantId);
  if (tplError) return { error: tplError.message };

  const { error } = await supabase
    .schema("ref")
    .from("service_types")
    .delete()
    .eq("id", variantId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/checklists");
  return { ok: true };
}
