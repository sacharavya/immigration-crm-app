// FORMS-2: shared types for extraction, diffing, and (later) mapping.

export type FormFieldType =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "unknown";

export type FormFieldSchema = {
  // AcroForm: the fully qualified field name.
  // XFA: the dotted element path inside the datasets packet,
  // e.g. "form1.Page1.PersonalDetails.FamilyName".
  path: string;
  type: FormFieldType;
  // Reserved for the mapping editor (FORMS-3); extraction never sets true.
  required: boolean;
  // XFA: the element repeats under its parent (array-like group).
  repeating: boolean;
  // AcroForm: the user-facing label (/TU alternate text) when present.
  label?: string;
};

export type DetectedFormType = "xfa" | "acroform";

export type ExtractionResult = {
  formType: DetectedFormType;
  fields: FormFieldSchema[];
  // Best-effort revision label ("08-2023") scraped from the document;
  // null when nothing matched. The admin can always override.
  versionLabel: string | null;
};

export type SchemaDiff = {
  added: string[];
  removed: string[];
  // Heuristic matches between a removed and an added path.
  renamed: Array<{ from: string; to: string }>;
  unchanged: number;
};
