import type { PageId, PageModel, Rotation } from "../types";

/**
 * Sets the ABSOLUTE net rotation for one page (the UI computes the next
 * step; this does not add to the existing rotation).
 */
export function rotateInModel(
  model: PageModel,
  pageId: PageId,
  rotation: Rotation,
): PageModel {
  if (!model.pages.some((p) => p.id === pageId)) {
    throw new Error(`rotateInModel: unknown page id "${pageId}"`);
  }
  return {
    pages: model.pages.map((p) => (p.id === pageId ? { ...p, rotation } : p)),
    totalSourceBytes: model.totalSourceBytes,
  };
}
