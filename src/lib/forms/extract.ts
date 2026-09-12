// FORMS-2: field extraction from an uploaded blank form PDF.
//
// Framework-agnostic: runs in the browser (upload dialog) and in Node (the
// tests). No PDF bytes ever leave the machine running this code.

import {
  decodePDFRawStream,
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFRawStream,
  PDFRef,
  PDFString,
  PDFTextField,
} from "pdf-lib";

import { flattenXmlPaths } from "./xml-paths";
import type {
  DetectedFormType,
  ExtractionResult,
  FormFieldSchema,
  FormFieldType,
} from "./types";

function fieldType(field: unknown): FormFieldType {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "dropdown";
  return "unknown";
}

// The /XFA entry is either an array of alternating packet-name strings and
// stream refs, or a single stream holding the whole XDP. Returns the XML of
// the requested packet, or of the whole XDP for the single-stream shape.
export function readXfaPacket(doc: PDFDocument, packetName: string): string | null {
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acroForm) return null;
  const xfa = acroForm.get(PDFName.of("XFA"));
  if (!xfa) return null;

  const decode = (ref: unknown): string | null => {
    const target = ref instanceof PDFRef ? doc.context.lookup(ref) : ref;
    if (!(target instanceof PDFRawStream)) return null;
    return new TextDecoder("utf-8").decode(decodePDFRawStream(target).decode());
  };

  const resolved = xfa instanceof PDFRef ? doc.context.lookup(xfa) : xfa;
  if (resolved instanceof PDFArray) {
    for (let i = 0; i < resolved.size() - 1; i++) {
      const name = resolved.get(i);
      const isName =
        (name instanceof PDFString || name instanceof PDFHexString) &&
        name.decodeText() === packetName;
      if (isName) return decode(resolved.get(i + 1));
    }
    return null;
  }
  return decode(resolved);
}

function hasXfa(doc: PDFDocument): boolean {
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  return Boolean(acroForm?.get(PDFName.of("XFA")));
}

// Best-effort revision label. IRCC prints "IMM 5257 (08-2023)" in the page
// footer, but pdf-lib has no text extraction and content streams are
// compressed, so instead we scan the raw bytes (metadata, info dict, and any
// uncompressed streams often carry it) for the "(MM-YYYY)" shape.
// ponytail: misses labels that live only inside compressed content streams;
// the admin can always type the label, and a pdfium-based text pass can
// replace this if the miss rate annoys in practice.
export function detectVersionLabel(bytes: Uint8Array): string | null {
  const CHUNK = 1 << 16;
  const decoder = new TextDecoder("latin1");
  const seen = new Map<string, number>();
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const text = decoder.decode(bytes.subarray(start, start + CHUNK + 32));
    for (const m of text.matchAll(/\((\d{2}-\d{4})\)/g)) {
      const label = m[1];
      const month = Number(label.slice(0, 2));
      if (month >= 1 && month <= 12) {
        seen.set(label, (seen.get(label) ?? 0) + 1);
      }
    }
  }
  if (seen.size === 0) return null;
  return [...seen.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function extractFormSchema(
  bytes: Uint8Array,
): Promise<ExtractionResult> {
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const versionLabel = detectVersionLabel(bytes);

  if (hasXfa(doc)) {
    const datasets = readXfaPacket(doc, "datasets");
    const fields: FormFieldSchema[] = datasets
      ? flattenXmlPaths(datasets)
          // Drop the xfa envelope elements; keep the form's own tree.
          .filter((p) => !p.path.startsWith("datasets.") || p.path.split(".").length > 2)
          .map((p) => ({
            path: p.path.replace(/^datasets\.data\./, ""),
            type: "text" as FormFieldType,
            required: false,
            repeating: p.repeating,
          }))
      : [];
    return { formType: "xfa" as DetectedFormType, fields, versionLabel };
  }

  const form = doc.getForm();
  const fields: FormFieldSchema[] = form.getFields().map((f) => {
    const tu = f.acroField.dict.lookupMaybe(PDFName.of("TU"), PDFString);
    return {
      path: f.getName(),
      type: fieldType(f),
      required: false,
      repeating: false,
      ...(tu ? { label: tu.decodeText() } : {}),
    };
  });
  return { formType: "acroform" as DetectedFormType, fields, versionLabel };
}
