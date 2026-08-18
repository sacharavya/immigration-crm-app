import type { PageId, PageModel } from "../types";

/**
 * Removes the given pages. Every id must exist in the model.
 * Deleting all pages yields an empty model.
 */
export function deleteFromModel(
  model: PageModel,
  pageIds: readonly PageId[],
): PageModel {
  const current = new Set<PageId>(model.pages.map((p) => p.id));
  for (const id of pageIds) {
    if (!current.has(id)) {
      throw new Error(`deleteFromModel: unknown page id "${id}"`);
    }
  }
  const toDelete = new Set(pageIds);
  return {
    pages: model.pages.filter((p) => !toDelete.has(p.id)),
    totalSourceBytes: model.totalSourceBytes,
  };
}
