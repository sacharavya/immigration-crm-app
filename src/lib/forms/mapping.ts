// FORMS-3: mapping model + copy-forward. mapping_json on a form version maps
// each form field path to a source. The DB trigger enforces the same
// required-fields activation rule; requiredGateBlockers mirrors it for UI.

import type { SchemaDiff } from "./types";

export type MappingSource = "profile" | "constant" | "manual" | "skip";

export type MappingEntry = {
  source: MappingSource;
  profile_path?: string;
  transform?: string;
  constant_value?: string;
  // For repeating groups when the form has fixed slots (row 1, row 2, ...).
  array_index?: number;
  required: boolean;
  // Carried forward from a previous version but the form field path no
  // longer exists in this version's schema.
  broken?: boolean;
};

export type FormMapping = Record<string, MappingEntry>;

export type FieldMappingStatus =
  | "mapped"
  | "unmapped"
  | "broken"
  | "manual"
  | "skip";

export function fieldStatus(
  entry: MappingEntry | undefined,
): FieldMappingStatus {
  if (!entry) return "unmapped";
  if (entry.broken) return "broken";
  if (entry.source === "manual") return "manual";
  if (entry.source === "skip") return "skip";
  if (entry.source === "constant") return "mapped";
  return entry.profile_path ? "mapped" : "unmapped";
}

// New version: carry the previous ACTIVE version's mapping forward.
//   - Field still exists: entry carried as-is.
//   - Field was renamed (per the diff heuristic): entry follows to the new
//     path so the admin resolves only genuine changes.
//   - Field gone: entry kept under the old path, marked broken, so the
//     admin can see the orphaned config and re-point or delete it.
export function copyMappingForward(
  prev: FormMapping,
  newFieldPaths: readonly string[],
  renamed: SchemaDiff["renamed"] = [],
): FormMapping {
  const exists = new Set(newFieldPaths);
  const renameByFrom = new Map(renamed.map((r) => [r.from, r.to]));
  const out: FormMapping = {};

  for (const [path, entry] of Object.entries(prev)) {
    const clean: MappingEntry = { ...entry };
    delete clean.broken;
    const renamedTo = renameByFrom.get(path);
    if (renamedTo && !prev[renamedTo]) {
      out[renamedTo] = clean;
    } else if (exists.has(path)) {
      out[path] = clean;
    } else {
      out[path] = { ...clean, broken: true };
    }
  }
  return out;
}

// Mirrors the crm.form_version_lifecycle trigger: a required entry must
// resolve from profile, constant, or be explicitly manual. Deliberately
// stricter than the trigger on one point: a broken required entry also
// blocks here (its target field no longer exists, so it cannot fill),
// while the SQL backstop only inspects source. Returns the offending
// paths (empty = activation allowed).
export function requiredGateBlockers(mapping: FormMapping): string[] {
  return Object.entries(mapping)
    .filter(
      ([, e]) =>
        e.required &&
        (e.broken === true ||
          !["profile", "constant", "manual"].includes(e.source)),
    )
    .map(([path]) => path);
}
