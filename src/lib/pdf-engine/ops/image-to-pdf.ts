// Wrap a single JPEG/PNG in a one-page PDF sized to the image, 1px = 1pt (72 dpi).
import { PDFDocument } from "pdf-lib";

export async function imageToPdf(
  bytes: Uint8Array,
  mime: "image/jpeg" | "image/png",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const image =
    mime === "image/jpeg" ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  const page = doc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return doc.save();
}
