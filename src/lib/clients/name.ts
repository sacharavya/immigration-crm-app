// Centralised "given/family from full legal name" derivation. The
// standalone /dashboard/clients/new form (and any downstream surface
// that needs the split) feeds the full name through here so the
// client row carries a usable first/last for retainers, emails, and
// search.
//
// Rule (per user spec):
//   - First word  → given_names
//   - Last word   → family_name (only when there are 2+ words)
//   - Middle words are intentionally dropped
//
// Examples:
//   "Ram Prasad Paudel"  → { given_names: "Ram",  family_name: "Paudel" }
//   "John Smith"         → { given_names: "John", family_name: "Smith"  }
//   "Madonna"            → { given_names: "Madonna", family_name: null  }
//   "  Maria  Garcia  "  → { given_names: "Maria",  family_name: "Garcia" }
//
// Compound family names ("de la Cruz", "van der Berg") collapse to a
// single trailing word — a known limitation. Staff can override the
// derived split via the intake form's editable Given/Family fields
// when that matters.

export type SplitLegalName = {
  given_names: string | null;
  family_name: string | null;
};

export function splitLegalName(legalName: string | null | undefined): SplitLegalName {
  if (!legalName) return { given_names: null, family_name: null };
  const parts = legalName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given_names: null, family_name: null };
  if (parts.length === 1) return { given_names: parts[0], family_name: null };
  return {
    given_names: parts[0],
    family_name: parts[parts.length - 1],
  };
}
