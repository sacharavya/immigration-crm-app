import { StandardFonts, rgb, type PDFDocument } from "pdf-lib";
import type { PageNumberFormat, PageNumberOptions } from "../types";

export function formatPageNumber(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  switch (format) {
    case "n":
      return `${n}`;
    case "n-of-total":
      return `${n} of ${total}`;
    case "page-n":
      return `Page ${n}`;
    case "page-n-of-total":
      return `Page ${n} of ${total}`;
  }
}

// v1 stamps in the unrotated coordinate space: on rotated pages the number
// follows the raw media box, not the visual orientation.
export async function stampPageNumbers(
  doc: PDFDocument,
  options: PageNumberOptions,
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = options.startAt + pages.length - 1;

  pages.forEach((page, i) => {
    const text = formatPageNumber(options.format, options.startAt + i, total);
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const { width, height } = page.getSize();

    let x: number;
    if (options.position.endsWith("left")) {
      x = options.marginPt;
    } else if (options.position.endsWith("right")) {
      x = width - options.marginPt - textWidth;
    } else {
      x = (width - textWidth) / 2;
    }

    const y = options.position.startsWith("top")
      ? height - options.marginPt - options.fontSize
      : options.marginPt;

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });
}
