export const ISSUING_BODIES = [
  "ircc",
  "oinp",
  "bcpnp",
  "aaip",
  "sinp",
  "other_province",
  "firm",
] as const;

export const ISSUING_BODY_LABELS: Record<(typeof ISSUING_BODIES)[number], string> = {
  ircc: "IRCC",
  oinp: "OINP",
  bcpnp: "BC PNP",
  aaip: "AAIP",
  sinp: "SINP",
  other_province: "Other province",
  firm: "Firm",
};

export const FORM_TYPES = ["xfa", "acroform", "portal_reference"] as const;

export const FORM_TYPE_LABELS: Record<(typeof FORM_TYPES)[number], string> = {
  xfa: "XFA",
  acroform: "AcroForm",
  portal_reference: "Portal reference",
};
