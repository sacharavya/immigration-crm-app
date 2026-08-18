import type { PDFDocument } from "pdf-lib";
import type { PdfMetadata } from "../types";

/** Apply only the metadata fields that were actually provided. */
export function applyMetadata(doc: PDFDocument, meta: PdfMetadata): void {
  if (meta.title !== undefined) doc.setTitle(meta.title);
  if (meta.author !== undefined) doc.setAuthor(meta.author);
  if (meta.subject !== undefined) doc.setSubject(meta.subject);
  if (meta.keywords !== undefined) doc.setKeywords(meta.keywords);
}
