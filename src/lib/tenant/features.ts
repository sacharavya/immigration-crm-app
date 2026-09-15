/**
 * Feature flags, resolved the same way the database does it
 * (crm.tenant_feature_enabled): a per-tenant override wins, otherwise the
 * catalogue default, otherwise on.
 *
 * Pure so it can be unit tested; the server wrapper lives in ./server.ts.
 */

export type FeatureKey =
  | "appointments"
  | "client_portal"
  | "referral_agents"
  | "pdf_tool"
  | "payments"
  | "reports";

export type FeatureCatalogueEntry = {
  key: string;
  label: string;
  description: string;
  default_enabled: boolean;
  display_order: number;
};

/** Per-tenant overrides as stored in crm.tenants.features. */
export type FeatureOverrides = Record<string, unknown>;

export function isFeatureEnabled(
  key: string,
  overrides: FeatureOverrides | null | undefined,
  catalogue: ReadonlyArray<Pick<FeatureCatalogueEntry, "key" | "default_enabled">>,
): boolean {
  const override = overrides?.[key];
  if (typeof override === "boolean") return override;

  const entry = catalogue.find((f) => f.key === key);
  if (entry) return entry.default_enabled;

  // Unknown key: fail open. A flag that hasn't been added to the catalogue
  // yet should not silently hide a working feature.
  return true;
}

/** Every key that resolves to on, for cheap lookup in a client component. */
export function enabledFeatureSet(
  overrides: FeatureOverrides | null | undefined,
  catalogue: ReadonlyArray<FeatureCatalogueEntry>,
): Set<string> {
  const on = new Set<string>();
  for (const entry of catalogue) {
    if (isFeatureEnabled(entry.key, overrides, catalogue)) on.add(entry.key);
  }
  return on;
}
