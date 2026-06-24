/**
 * Shared URL builder for the clients worklist.
 * All filter/sort/segment state lives in the URL.
 */

export type WorklistParams = {
  segment?: string | null;
  sort?: string | null;
  q?: string | null;
  owner?: string | null;
  stage?: string | null;       // comma-separated
  service?: string | null;     // comma-separated
  imm_status?: string | null;  // comma-separated
  citizenship?: string | null; // comma-separated
  expiry?: string | null;      // "30" | "60" | "90" | "expired"
};

export function buildHref(
  current: WorklistParams,
  overrides: Partial<WorklistParams>,
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();

  if (merged.segment && merged.segment !== "all") params.set("segment", merged.segment);
  if (merged.sort && merged.sort !== "urgency") params.set("sort", merged.sort);
  if (merged.q) params.set("q", merged.q);
  if (merged.owner) params.set("owner", merged.owner);
  if (merged.stage) params.set("stage", merged.stage);
  if (merged.service) params.set("service", merged.service);
  if (merged.imm_status) params.set("imm_status", merged.imm_status);
  if (merged.citizenship) params.set("citizenship", merged.citizenship);
  if (merged.expiry) params.set("expiry", merged.expiry);

  const qs = params.toString();
  return qs ? `/dashboard/clients?${qs}` : "/dashboard/clients";
}

/** Count how many filter facets are active (excludes segment, sort, search). */
export function activeFilterCount(p: WorklistParams): number {
  let count = 0;
  if (p.owner) count++;
  if (p.stage) count++;
  if (p.service) count++;
  if (p.imm_status) count++;
  if (p.citizenship) count++;
  if (p.expiry) count++;
  return count;
}
