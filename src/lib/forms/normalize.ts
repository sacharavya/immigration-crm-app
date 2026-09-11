// FORMS-3: value normalizers used by the adapter. Pure functions with tests;
// DB dates are already ISO (DATE columns) and countries already ISO 3166-1
// alpha-2 (CHAR(2) FKs to ref.countries), so those pass through untouched.

// Split a full legal name when given/family are not stored separately.
// Last token is the family name, the rest are given names. Single-token
// names become given with no family (IRCC's mononym convention varies per
// form; the mapping layer can override with constants when needed).
export function splitName(full: string): {
  given: string | null;
  family: string | null;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: null, family: null };
  if (parts.length === 1) return { given: parts[0], family: null };
  return {
    given: parts.slice(0, -1).join(" "),
    family: parts[parts.length - 1],
  };
}

// Best-effort E.164. Honors an explicit +country; otherwise assumes NANP
// for bare 10-digit numbers and 11-digit numbers starting with 1 (the
// firm's Canadian client base), and keeps anything else as digits with a
// leading + only when it plausibly already carries a country code.
// ponytail: full ITU number-plan validation is out of scope; the mapping
// layer sees whatever intake collected, and forms accept free text.
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 0) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
