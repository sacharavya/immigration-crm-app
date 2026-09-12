// FORMS-4: the fill engine. Framework-agnostic: runs in the browser (the
// Generate form dialog) and in Node (tests). No PDF bytes leave the machine
// running this code; the caller handles storage.

import {
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFString,
  PDFTextField,
} from "pdf-lib";

import { type FormMapping, type MappingEntry } from "./mapping";
import { resolveProfilePath, type ApplicantProfile } from "./profile";
import { applyTransform, type TransformContext } from "./transforms";

export type UnmappedField = {
  path: string;
  reason:
    | "unmapped"
    | "manual"
    | "skip"
    | "broken"
    | "no_data"
    | "field_missing"
    | "option_mismatch"
    | "write_failed";
};

export type FillResult = {
  bytes: Uint8Array;
  // Fields left blank and why; required blanks are the caller's cue to
  // warn the staff member before the output ships.
  unmapped: UnmappedField[];
};

// Resolve one mapping entry to the value that should land in the form.
// undefined = leave blank (the reason goes to `unmapped`).
export function resolveEntryValue(
  entry: MappingEntry,
  profile: ApplicantProfile,
  ctx: TransformContext,
): { value: unknown; blank?: UnmappedField["reason"] } {
  if (entry.broken) return { value: undefined, blank: "broken" };
  if (entry.source === "manual") return { value: undefined, blank: "manual" };
  if (entry.source === "skip") return { value: undefined, blank: "skip" };
  if (entry.source === "constant") {
    const v = entry.constant_value ?? "";
    return v === "" ? { value: undefined, blank: "no_data" } : { value: v };
  }
  if (!entry.profile_path) return { value: undefined, blank: "unmapped" };
  const raw = resolveProfilePath(
    profile,
    entry.profile_path,
    entry.array_index ?? 0,
  );
  if (raw === undefined || raw === null || raw === "") {
    return { value: undefined, blank: "no_data" };
  }
  return { value: applyTransform(entry.transform, raw, ctx) };
}

// ---------------------------------------------------------------------------
// AcroForm fill
// ---------------------------------------------------------------------------

export async function fillAcroForm(
  bytes: Uint8Array,
  mapping: FormMapping,
  profile: ApplicantProfile,
  ctx: TransformContext,
  options: { flatten?: boolean } = {},
): Promise<FillResult> {
  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const form = doc.getForm();
  const unmapped: UnmappedField[] = [];

  for (const [path, entry] of Object.entries(mapping)) {
    const { value, blank } = resolveEntryValue(entry, profile, ctx);
    if (blank) {
      unmapped.push({ path, reason: blank });
      continue;
    }
    let field;
    try {
      field = form.getField(path);
    } catch {
      unmapped.push({ path, reason: "field_missing" });
      continue;
    }
    try {
      if (field instanceof PDFTextField) {
        field.setText(String(value));
      } else if (field instanceof PDFCheckBox) {
        if (value === true || value === "true" || value === "1") field.check();
        else field.uncheck();
      } else if (
        field instanceof PDFRadioGroup ||
        field instanceof PDFDropdown ||
        field instanceof PDFOptionList
      ) {
        field.select(String(value));
      } else {
        unmapped.push({ path, reason: "write_failed" });
      }
    } catch {
      // Radio/dropdown option names must match exactly; a transform that
      // yields an unknown option lands here.
      unmapped.push({ path, reason: "option_mismatch" });
    }
  }

  // Flatten firm templates only. Official forms stay interactive so the
  // staff member can correct fields in Adobe before submission.
  if (options.flatten) form.flatten();

  return { bytes: await doc.save(), unmapped };
}

// ---------------------------------------------------------------------------
// XFA fill: rebuild the datasets packet from mapped values.
// ---------------------------------------------------------------------------

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type XmlNode = { children: Map<string, XmlNode[]>; text?: string };

function newNode(): XmlNode {
  return { children: new Map() };
}

// Insert a dotted path (array_index picks the repeated sibling) with a
// leaf text value into the tree.
function insertPath(
  root: XmlNode,
  path: string,
  index: number,
  value: string,
): void {
  const segs = path.split(".");
  let node = root;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const last = i === segs.length - 1;
    // The repeated slot applies to the segment the schema marks repeating;
    // without that knowledge here, the LEAF's parent group repeats when
    // index > 0. Keep it simple: index applies to the second-to-last
    // segment (the row group), which matches IRCC's fixed-slot forms.
    const slot = i === segs.length - 2 ? index : 0;
    const list = node.children.get(seg) ?? [];
    while (list.length <= slot) list.push(newNode());
    node.children.set(seg, list);
    node = list[slot];
    if (last) node.text = value;
  }
}

function serialize(node: XmlNode, name: string): string {
  const kids: string[] = [];
  for (const [child, list] of node.children) {
    for (const n of list) kids.push(serialize(n, child));
  }
  const inner = kids.length > 0 ? kids.join("") : xmlEscape(node.text ?? "");
  return `<${name}>${inner}</${name}>`;
}

export function buildDatasetsXml(
  mapping: FormMapping,
  profile: ApplicantProfile,
  ctx: TransformContext,
): { xml: string; unmapped: UnmappedField[] } {
  const root = newNode();
  const unmapped: UnmappedField[] = [];
  for (const [path, entry] of Object.entries(mapping)) {
    const { value, blank } = resolveEntryValue(entry, profile, ctx);
    if (blank) {
      unmapped.push({ path, reason: blank });
      continue;
    }
    insertPath(root, path, entry.array_index ?? 0, String(value));
  }
  const inner = [...root.children.entries()]
    .map(([name, list]) => list.map((n) => serialize(n, name)).join(""))
    .join("");
  const xml = `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data>${inner}</xfa:data></xfa:datasets>`;
  return { xml, unmapped };
}

export async function fillXfa(
  bytes: Uint8Array,
  mapping: FormMapping,
  profile: ApplicantProfile,
  ctx: TransformContext,
): Promise<FillResult> {
  const { xml, unmapped } = buildDatasetsXml(mapping, profile, ctx);

  const doc = await PDFDocument.load(bytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acroForm) throw new Error("Not an XFA form: AcroForm dict missing");
  const xfaRaw = acroForm.get(PDFName.of("XFA"));
  if (!xfaRaw) throw new Error("Not an XFA form: XFA entry missing");
  const resolved = xfaRaw instanceof PDFRef ? doc.context.lookup(xfaRaw) : xfaRaw;

  const stream = doc.context.stream(xml);
  const streamRef = doc.context.register(stream);

  // Array shape ([name, streamRef, ...]): replace the ref that follows the
  // "datasets" name; single-stream shape: replace the whole entry.
  if (resolved instanceof PDFArray) {
    let replaced = false;
    for (let i = 0; i < resolved.size() - 1; i++) {
      const name = resolved.get(i);
      const isDatasets =
        (name instanceof PDFString || name instanceof PDFHexString) &&
        name.decodeText() === "datasets";
      if (isDatasets) {
        resolved.set(i + 1, streamRef);
        replaced = true;
        break;
      }
    }
    if (!replaced) throw new Error("XFA datasets packet not found");
  } else {
    acroForm.set(PDFName.of("XFA"), streamRef);
  }

  // The pre-rendered pages and any 2D barcode are untouched; Adobe Reader
  // re-renders from the new datasets, and staff validate there.
  return { bytes: await doc.save(), unmapped };
}
