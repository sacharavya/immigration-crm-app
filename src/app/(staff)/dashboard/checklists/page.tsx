import { format, formatDistanceToNow } from "date-fns";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import {
  type CategoryCardData,
  type ChecklistRowMini,
} from "./_components/category-card";
import { ChecklistsList } from "./_components/checklists-list";
import { GroupsSection, type GroupRow } from "./_components/groups-section";
import { type VariantStatusKind } from "./_components/variant-table";

export default async function ChecklistsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_templates")) {
    redirect("/dashboard?error=forbidden_manage_templates");
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const [
    { data: categoryRows },
    { data: variants },
    { data: templates },
    { data: cases },
    { data: groups },
    { data: groupUsage },
  ] = await Promise.all([
    supabase
      .schema("ref")
      .from("service_categories")
      .select("code, name, description, display_order")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .schema("ref")
      .from("service_types")
      .select(
        `
          id,
          name,
          category_code,
          sub_category,
          deactivated_at,
          scheduled_deactivation_at,
          created_at
        `,
      )
      .order("name"),
    supabase
      .schema("ref")
      .from("service_templates")
      .select(
        "id, service_type_id, version, effective_from, effective_to, created_at",
      ),
    supabase
      .schema("crm")
      .from("cases")
      .select("service_type_id, status, deleted_at"),
    supabase
      .schema("ref")
      .from("checklist_groups")
      .select("code, name, description, display_order, is_active")
      .order("display_order"),
    supabase
      .schema("ref")
      .from("template_documents")
      .select("group_code"),
  ]);

  const allTemplates = templates ?? [];
  const allCases = cases ?? [];
  const allVariants = variants ?? [];
  const allGroups = groups ?? [];

  function pickActiveVersion(serviceTypeId: string): {
    version: number | null;
    futureVersionLabel: string | null;
  } {
    const ofType = allTemplates.filter((t) => t.service_type_id === serviceTypeId);
    if (ofType.length === 0) return { version: null, futureVersionLabel: null };
    const active = ofType
      .filter(
        (t) =>
          t.effective_from <= today &&
          (t.effective_to === null || t.effective_to >= today),
      )
      .sort((a, b) => b.version - a.version)[0];
    const future = ofType
      .filter((t) => t.effective_from > today)
      .sort((a, b) => a.effective_from.localeCompare(b.effective_from))[0];
    return {
      version: active?.version ?? null,
      futureVersionLabel: future
        ? `v${future.version} starts ${format(
            new Date(future.effective_from),
            "MMM d",
          )}`
        : null,
    };
  }

  function pickStatus(
    v: {
      deactivated_at: string | null;
      scheduled_deactivation_at: string | null;
    },
    hasActiveTemplate: boolean,
  ): { statusKind: VariantStatusKind; statusDate: string | null } {
    if (v.deactivated_at !== null) {
      return {
        statusKind: "deactivated",
        statusDate: format(new Date(v.deactivated_at), "MMM d, yyyy"),
      };
    }
    if (
      v.scheduled_deactivation_at !== null &&
      v.scheduled_deactivation_at > nowIso
    ) {
      return {
        statusKind: "scheduled_deactivation",
        statusDate: format(
          new Date(v.scheduled_deactivation_at),
          "MMM d, yyyy",
        ),
      };
    }
    if (!hasActiveTemplate) {
      return { statusKind: "no_active_checklist", statusDate: null };
    }
    return { statusKind: "active", statusDate: null };
  }

  function inFlightCount(serviceTypeId: string): number {
    return allCases.filter(
      (c) =>
        c.service_type_id === serviceTypeId &&
        c.status !== "closed" &&
        c.deleted_at === null,
    ).length;
  }

  function lastEditedFor(
    serviceTypeId: string,
    variantCreatedAt: string,
  ): string {
    const candidates: string[] = [variantCreatedAt];
    for (const t of allTemplates) {
      if (t.service_type_id === serviceTypeId) candidates.push(t.created_at);
    }
    const latestIso = candidates.sort().slice(-1)[0];
    return formatDistanceToNow(new Date(latestIso), { addSuffix: true });
  }

  const allChecklists: (ChecklistRowMini & { categoryCode: string })[] =
    allVariants.map((v) => {
      const { version, futureVersionLabel } = pickActiveVersion(v.id);
      const { statusKind, statusDate } = pickStatus(v, version !== null);
      return {
        id: v.id,
        name: v.name,
        subCategory: v.sub_category,
        statusKind,
        statusDate,
        activeVersion: version !== null ? `v${version}` : null,
        futureVersionLabel,
        inFlightCases: inFlightCount(v.id),
        lastEdited: lastEditedFor(v.id, v.created_at),
        categoryCode: v.category_code,
      };
    });

  const categoryCards: CategoryCardData[] = (categoryRows ?? []).map((c) => ({
    code: c.code,
    name: c.name,
    description: c.description,
    displayOrder: c.display_order,
    checklists: allChecklists
      .filter((ch) => ch.categoryCode === c.code)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        subCategory: ch.subCategory,
        statusKind: ch.statusKind,
        statusDate: ch.statusDate,
        activeVersion: ch.activeVersion,
        futureVersionLabel: ch.futureVersionLabel,
        inFlightCases: ch.inFlightCases,
        lastEdited: ch.lastEdited,
      })),
  }));

  const totalChecklists = allChecklists.length;
  const activeCount = allChecklists.filter(
    (c) => c.statusKind === "active",
  ).length;
  const scheduledCount = allChecklists.filter(
    (c) => c.statusKind === "scheduled_deactivation",
  ).length;
  const categoryCount = (categoryRows ?? []).length;

  // ---- New-checklist dialog props -----------------------------------------

  const copySources = allChecklists
    .filter((c) => c.activeVersion !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      categoryCode: c.categoryCode,
      categoryName:
        (categoryRows ?? []).find((cat) => cat.code === c.categoryCode)?.name ??
        c.categoryCode,
    }));

  const subCategoriesByCategory: Record<string, string[]> = {};
  for (const v of allVariants) {
    if (!v.sub_category || v.sub_category.trim() === "") continue;
    const arr = subCategoriesByCategory[v.category_code] ?? [];
    if (!arr.includes(v.sub_category)) arr.push(v.sub_category);
    subCategoriesByCategory[v.category_code] = arr;
  }
  for (const code of Object.keys(subCategoriesByCategory)) {
    subCategoriesByCategory[code].sort();
  }

  // ---- Groups section -----------------------------------------------------

  const groupUsageCount = new Map<string, number>();
  for (const g of groupUsage ?? []) {
    groupUsageCount.set(
      g.group_code,
      (groupUsageCount.get(g.group_code) ?? 0) + 1,
    );
  }
  const groupRows: GroupRow[] = allGroups.map((g) => ({
    code: g.code,
    name: g.name,
    description: g.description,
    displayOrder: g.display_order,
    isActive: g.is_active,
    inUseCount: groupUsageCount.get(g.code) ?? 0,
  }));

  return (
    <main className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Checklists
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {categoryCount} categor{categoryCount === 1 ? "y" : "ies"},{" "}
            {totalChecklists} checklist{totalChecklists === 1 ? "" : "s"},{" "}
            {activeCount} active, {scheduledCount} scheduled
          </p>
        </div>
      </div>

      <ChecklistsList
        categories={categoryCards}
        newDialogProps={{
          categoryOptions: (categoryRows ?? []).map((c) => ({
            code: c.code,
            name: c.name,
          })),
          copySources,
          subCategoriesByCategory,
        }}
      />

      <GroupsSection groups={groupRows} />
    </main>
  );
}
