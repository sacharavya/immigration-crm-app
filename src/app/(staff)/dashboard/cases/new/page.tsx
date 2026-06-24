import Link from "next/link";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { NewCaseWizard } from "./_components/wizard";
import type { ClientSearchResult } from "./actions";

type Props = {
  searchParams: Promise<{ client_id?: string }>;
};

export default async function NewCasePage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "create_cases")) {
    redirect("/dashboard?error=forbidden_create_cases");
  }

  const sp = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const [
    { data: serviceCategories },
    { data: serviceTypes },
    { data: templates },
    { data: countries },
    { data: rcicStaff },
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
          code,
          name,
          description,
          typical_duration_days,
          category_code,
          deactivated_at,
          scheduled_deactivation_at,
          display_order
        `,
      )
      .order("display_order"),
    supabase
      .schema("ref")
      .from("service_templates")
      .select("service_type_id, effective_from, effective_to"),
    supabase
      .schema("ref")
      .from("countries")
      .select("code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name")
      .eq("is_rcic", true)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("last_name", { ascending: true }),
  ]);

  const rcicOptions = (rcicStaff ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`.trim(),
  }));

  // Mirror ref.is_variant_active() in JS so we don't need a per-row RPC.
  function isVariantActive(v: {
    deactivated_at: string | null;
    scheduled_deactivation_at: string | null;
  }): boolean {
    if (v.deactivated_at !== null) return false;
    if (
      v.scheduled_deactivation_at !== null &&
      v.scheduled_deactivation_at <= nowIso
    ) {
      return false;
    }
    return true;
  }

  const typesWithChecklist = new Set(
    (templates ?? [])
      .filter(
        (t) =>
          t.effective_from <= today &&
          (t.effective_to === null || t.effective_to >= today),
      )
      .map((t) => t.service_type_id),
  );

  const variants = (serviceTypes ?? [])
    .filter(isVariantActive)
    .filter((v) => typesWithChecklist.has(v.id))
    .map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      description: v.description,
      typicalDurationDays: v.typical_duration_days,
      categoryCode: v.category_code,
    }));

  // Drop categories with zero usable variants — they're noise in the picker.
  const usableCategoryCodes = new Set(variants.map((v) => v.categoryCode));
  const categories = (serviceCategories ?? [])
    .filter((c) => usableCategoryCodes.has(c.code))
    .map((c) => ({
      code: c.code,
      name: c.name,
      description: c.description,
      variantCount: variants.filter((v) => v.categoryCode === c.code).length,
    }));

  const canManageTemplates = staffCan(me, "manage_templates");

  // Optional client preselect via ?client_id=<uuid>. We fetch only the fields
  // the wizard needs (matches ClientSearchResult shape). If the id doesn't
  // resolve to a live client, fall through with no preselect rather than
  // erroring — the wizard's search step still works.
  let preselectedClient: ClientSearchResult | null = null;
  if (sp.client_id && /^[0-9a-f-]{36}$/i.test(sp.client_id)) {
    const { data } = await supabase
      .schema("crm")
      .from("clients")
      .select("id, client_number, legal_name_full, email, country_of_residence")
      .eq("id", sp.client_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (data) preselectedClient = data;
  }

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-stone-500">
            <Link href="/dashboard" className="hover:text-stone-800">
              Cases
            </Link>
            <span>›</span>
            <span className="text-stone-800">New case</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <NewCaseWizard
          categories={categories}
          variants={variants}
          countries={countries ?? []}
          rcicOptions={rcicOptions}
          canManageTemplates={canManageTemplates}
          preselectedClient={preselectedClient}
        />
      </main>
    </div>
  );
}
