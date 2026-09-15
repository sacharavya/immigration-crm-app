import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { getStaffTenantId } from "./context";
import {
  enabledFeatureSet,
  isFeatureEnabled,
  type FeatureCatalogueEntry,
  type FeatureKey,
} from "./features";

/** The switch list the super admin portal renders. */
export const getFeatureCatalogue = cache(
  async (): Promise<FeatureCatalogueEntry[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .schema("platform")
      .from("features")
      .select("key, label, description, default_enabled, display_order")
      .order("display_order");
    return data ?? [];
  },
);

/**
 * Features switched on for the signed-in staff member's firm.
 *
 * Reads crm.tenants through the session client, so RLS already limits it to
 * the caller's own firm row.
 */
export const getEnabledFeatures = cache(async (): Promise<Set<string>> => {
  const tenantId = await getStaffTenantId();
  const catalogue = await getFeatureCatalogue();
  if (!tenantId) return enabledFeatureSet(null, catalogue);

  const supabase = await createClient();
  const { data } = await supabase
    .schema("crm")
    .from("tenants")
    .select("features")
    .eq("id", tenantId)
    .maybeSingle();

  return enabledFeatureSet(
    (data?.features as Record<string, unknown> | null) ?? null,
    catalogue,
  );
});

/** Guard for a page belonging to an optional module. */
export async function featureEnabled(key: FeatureKey): Promise<boolean> {
  const catalogue = await getFeatureCatalogue();
  const tenantId = await getStaffTenantId();
  if (!tenantId) return isFeatureEnabled(key, null, catalogue);

  const supabase = await createClient();
  const { data } = await supabase
    .schema("crm")
    .from("tenants")
    .select("features")
    .eq("id", tenantId)
    .maybeSingle();

  return isFeatureEnabled(
    key,
    (data?.features as Record<string, unknown> | null) ?? null,
    catalogue,
  );
}
