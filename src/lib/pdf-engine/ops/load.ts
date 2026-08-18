import { PDFDocument } from "pdf-lib";
import type { SupportedMime } from "../types";
import { imageToPdf } from "./image-to-pdf";

export interface LoadedSource {
  doc: PDFDocument;
  pageCount: number;
  kind: "pdf" | "image";
  /**
   * Bytes PDFium can open directly: the input bytes for PDFs, the wrapped
   * single-page PDF for images. Renderers must use these, never the raw image.
   */
  bytes: Uint8Array;
}

/**
 * Load raw bytes into a pdf-lib document. Images are first converted to a
 * single-page PDF via imageToPdf so callers only ever deal with PDFDocument.
 */
export async function loadSource(input: {
  bytes: Uint8Array;
  mime: SupportedMime;
}): Promise<LoadedSource> {
  if (input.mime === "application/pdf") {
    let doc: PDFDocument;
    try {
      // updateMetadata: false keeps the source's ModDate/Producer intact.
      doc = await PDFDocument.load(input.bytes, { updateMetadata: false });
    } catch (err) {
      // pdf-lib throws EncryptedPDFError for encrypted files and parse errors
      // for corrupt ones; wrap both so the UI gets one clear message.
      const detail = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Could not load PDF: the file is encrypted or not a valid PDF. (${detail})`,
      );
    }
    return { doc, pageCount: doc.getPageCount(), kind: "pdf", bytes: input.bytes };
  }

  const pdfBytes = await imageToPdf(input.bytes, input.mime);
  const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false });
  return { doc, pageCount: doc.getPageCount(), kind: "image", bytes: pdfBytes };
}
