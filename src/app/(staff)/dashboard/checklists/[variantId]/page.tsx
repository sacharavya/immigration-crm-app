import { notFound, redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { fetchAllowsMultipleByDocId } from "@/lib/files/template-docs";

import {
  VariantEditorShell,
  type ChecklistGroupOption,
  type TemplateDocument,
  type TemplateVersion,
  type VariantSummary,
} from "./_components/variant-editor-shell";

type Props = {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ v?: string }>;
};

export default async function VariantEditorPage({ params, searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_templates")) {
    redirect("/dashboard?error=forbidden_manage_templates");
  }

  const { variantId } = await params;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const { data: variant } = await supabase
    .schema("ref")
    .from("service_types")
    .select(
      `
        id,
        code,
        name,
        description,
        typical_duration_days,
        category_code,
        sub_category,
        deactivated_at,
        scheduled_deactivation_at,
        deactivation_reason,
        category:service_categories(name)
      `,
    )
    .eq("id", variantId)
    .maybeSingle();
  if (!variant) notFound();

  const [
    { data: templates },
    { data: docs },
    { data: groups },
    { data: subCatRows },
  ] = await Promise.all([
    supabase
      .schema("ref")
      .from("service_templates")
      .select("id, version, effective_from, effective_to, notes")
      .eq("service_type_id", variantId)
      .order("version", { ascending: true }),
    supabase
      .schema("ref")
      .from("template_documents")
      .select(
        `
          id,
          service_template_id,
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
      .order("display_order"),
    supabase
      .schema("ref")
      .from("checklist_groups")
      .select("code, name, display_order, is_active")
      .order("display_order"),
    supabase
      .schema("ref")
      .from("service_types")
      .select("sub_category")
      .not("sub_category", "is", null),
  ]);

  const subCategorySuggestions = Array.from(
    new Set(
      (subCatRows ?? [])
        .map((r) => r.sub_category)
        .filter((s): s is string => s !== null && s.trim() !== ""),
    ),
  ).sort();

  const allTemplates = templates ?? [];
  const allDocs = docs ?? [];
  // Tolerant read so a missing column never blanks the editor (see
  // fetchAllowsMultipleByDocId). Defaults to single (false) when absent.
  const allowsMultipleById = await fetchAllowsMultipleByDocId(
    supabase,
    allDocs.map((d) => d.id),
  );

  // Pick the selected version. Order of preference:
  //   1. ?v=<id> if it matches a real template.
  //   2. The NEWEST version (highest version number) — this is what
  //      staff almost always want when they just created a new
  //      version, since the dialog defaults the user there.
  //   3. The currently-effective version, as a fallback when the
  //      newest is somehow missing.
  //
  // Previously this defaulted to the currently-effective version
  // first, which broke "create new scheduled version → land on
  // page" UX: the page would show the OLD (now-clipped) active
  // version, and any edit would hit the "past versions are read-
  // only" gate even though staff just made a fresh editable one.
  const selectedFromQuery = allTemplates.find((t) => t.id === sp.v);
  const newestVersion = allTemplates[allTemplates.length - 1] ?? null;
  const activeVersion = allTemplates.find(
    (t) =>
      t.effective_from <= today &&
      (t.effective_to === null || t.effective_to >= today),
  );
  const selectedTemplate =
    selectedFromQuery ?? newestVersion ?? activeVersion ?? null;

  function classify(t: { effective_from: string; effective_to: string | null }) {
    if (t.effective_to !== null && t.effective_to < today) return "past" as const;
    if (t.effective_from > today) return "scheduled" as const;
    return "active" as const;
  }

  const versions: TemplateVersion[] = allTemplates.map((t) => ({
    id: t.id,
    version: t.version,
    effectiveFrom: t.effective_from,
    effectiveTo: t.effective_to,
    notes: t.notes,
    state: classify(t),
  }));

  const selectedDocs: TemplateDocument[] = selectedTemplate
    ? allDocs
        .filter((d) => d.service_template_id === selectedTemplate.id)
        .map((d) => ({
          id: d.id,
          documentCode: d.document_code,
          documentLabel: d.document_label,
          groupCode: d.group_code,
          conditionLabel: d.condition_label,
          allowedFileTypes: d.allowed_file_types,
          maxFileSizeMb: d.max_file_size_mb,
          instructions: d.instructions,
          expectedQuantity: d.expected_quantity,
          allowsMultiple: allowsMultipleById[d.id] ?? false,
          displayOrder: d.display_order,
        }))
    : [];

  const summary: VariantSummary = {
    id: variant.id,
    name: variant.name,
    description: variant.description,
    typicalDurationDays: variant.typical_duration_days,
    categoryName: variant.category?.name ?? variant.category_code,
    subCategory: variant.sub_category,
    deactivatedAt: variant.deactivated_at,
    scheduledDeactivationAt: variant.scheduled_deactivation_at,
    deactivationReason: variant.deactivation_reason,
  };

  const groupOptions: ChecklistGroupOption[] = (groups ?? []).map((g) => ({
    code: g.code,
    name: g.name,
    displayOrder: g.display_order,
    isActive: g.is_active,
  }));

  return (
    <main className="space-y-6 px-6 py-8">
      <VariantEditorShell
        variant={summary}
        versions={versions}
        selectedVersionId={selectedTemplate?.id ?? null}
        selectedDocs={selectedDocs}
        groupOptions={groupOptions}
        subCategorySuggestions={subCategorySuggestions}
        canDelete={staffCan(me, "delete_checklists")}
      />
    </main>
  );
}
