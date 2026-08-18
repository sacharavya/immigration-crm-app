import { PDFDocument, degrees } from "pdf-lib";
import type { Rotation } from "../types";

export interface MergeInput {
  doc: PDFDocument;
  pageIndex: number;
  rotation: Rotation;
}

/**
 * Copies the requested pages, in order, into a fresh document. Rotation is
 * ADDED to whatever rotation the source page already carries, normalized to
 * 0-359 (scanned inputs often arrive pre-rotated).
 */
export async function mergePages(
  items: readonly MergeInput[],
  onPage?: (completed: number, total: number) => void,
): Promise<PDFDocument> {
  const out = await PDFDocument.create();
  for (let i = 0; i < items.length; i++) {
    const { doc, pageIndex, rotation } = items[i];
    // One page per copyPages call keeps peak memory bounded on large merges.
    const [page] = await out.copyPages(doc, [pageIndex]);
    // Double modulo guards against a negative angle in the source page.
    const angle = (((page.getRotation().angle + rotation) % 360) + 360) % 360;
    page.setRotation(degrees(angle));
    out.addPage(page);
    onPage?.(i + 1, items.length);
  }
  return out;
}
