import type { PageId, PageModel } from "../types";

/**
 * Reorders pages to match orderedPageIds, which must be a permutation of the
 * current page id set (same members, no dupes, no extras).
 */
export function reorderModel(
  model: PageModel,
  orderedPageIds: readonly PageId[],
): PageModel {
  if (orderedPageIds.length !== model.pages.length) {
    throw new Error(
      `reorderModel: expected exactly ${model.pages.length} page ids, got ${orderedPageIds.length}`,
    );
  }
  const byId = new Map(model.pages.map((p) => [p.id, p]));
  const seen = new Set<PageId>();
  const pages = orderedPageIds.map((id) => {
    if (seen.has(id)) {
      throw new Error(`reorderModel: duplicate page id "${id}"`);
    }
    seen.add(id);
    const page = byId.get(id);
    if (!page) {
      throw new Error(`reorderModel: unknown page id "${id}"`);
    }
    // Same length + no dupes + all known = exact permutation; refs unchanged.
    return page;
  });
  return { pages, totalSourceBytes: model.totalSourceBytes };
}
