import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

// Builds the "<Category> - <Sub-category>" label staff see in Section 2
// of the retainer (e.g. "Visitor Visa - Family Friend"). Falls back
// progressively when either side is missing.
//
// Lives in src/lib/retainer/ because it's shared between
// loadRetainerData (rendering) and sendRetainerForSignature (snapshot).
export async function resolveServiceLabel(
  supabase: SupabaseClient<Database>,
  serviceTypeId: string,
): Promise<string | null> {
  const { data: serviceType } = await supabase
    .schema("ref")
    .from("service_types")
    .select("name, category_code")
    .eq("id", serviceTypeId)
    .maybeSingle();
  if (!serviceType) return null;

  if (!serviceType.category_code) return serviceType.name ?? null;

  const { data: category } = await supabase
    .schema("ref")
    .from("service_categories")
    .select("name")
    .eq("code", serviceType.category_code)
    .maybeSingle();

  if (category?.name && serviceType.name) {
    return `${category.name} - ${serviceType.name}`;
  }
  return serviceType.name ?? null;
}
