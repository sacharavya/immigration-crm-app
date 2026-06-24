import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { NewVariantWizard, type CategoryOption, type CopySource } from "./_components/wizard";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export default async function NewVariantPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_templates")) {
    redirect("/dashboard?error=forbidden_manage_templates");
  }

  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const [
    { data: categories },
    { data: variants },
    { data: templates },
  ] = await Promise.all([
    supabase
      .schema("ref")
      .from("service_categories")
      .select("code, name, display_order")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, code, name, category_code, deactivated_at")
      .order("name"),
    supabase
      .schema("ref")
      .from("service_templates")
      .select("id, service_type_id, version, effective_from, effective_to"),
  ]);

  // Build the copy-source list: every variant with at least one active or
  // historic template. The wizard groups these by category in the UI.
  const activeTemplateByVariant = new Map<string, { version: number }>();
  for (const t of templates ?? []) {
    if (
      t.effective_from <= today &&
      (t.effective_to === null || t.effective_to >= today)
    ) {
      const prev = activeTemplateByVariant.get(t.service_type_id);
      if (!prev || t.version > prev.version) {
        activeTemplateByVariant.set(t.service_type_id, {
          version: t.version,
        });
      }
    }
  }

  const copySources: CopySource[] = (variants ?? [])
    .filter((v) => activeTemplateByVariant.has(v.id))
    .map((v) => ({
      id: v.id,
      name: v.name,
      categoryCode: v.category_code,
      activeVersion: activeTemplateByVariant.get(v.id)!.version,
      isDeactivated: v.deactivated_at !== null,
    }));

  const categoryOptions: CategoryOption[] = (categories ?? []).map((c) => ({
    code: c.code,
    name: c.name,
  }));

  const preselectedCategory =
    sp.category &&
    categoryOptions.some((c) => c.code === sp.category)
      ? sp.category
      : "";

  return (
    <main className="space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          Create checklist
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Adds a new checklist with its initial v1 contents.
        </p>
      </div>

      <NewVariantWizard
        categories={categoryOptions}
        copySources={copySources}
        defaultCategoryCode={preselectedCategory}
      />
    </main>
  );
}
