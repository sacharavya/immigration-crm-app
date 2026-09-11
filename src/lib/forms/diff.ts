// FORMS-2: schema diff between two versions of a form.

import type { FormFieldSchema, SchemaDiff } from "./types";

function lastSegment(path: string): string {
  const i = path.lastIndexOf(".");
  return i === -1 ? path : path.slice(i + 1);
}

// Rename heuristic: a removed path and an added path match when they share a
// label (AcroForm /TU) or the same final path segment. Each side matches at
// most once; ambiguous candidates (two added fields with the same suffix)
// stay as plain added/removed rather than guessing.
export function diffFieldSchemas(
  prev: FormFieldSchema[],
  next: FormFieldSchema[],
): SchemaDiff {
  const prevByPath = new Map(prev.map((f) => [f.path, f]));
  const nextByPath = new Map(next.map((f) => [f.path, f]));

  const removed = prev.filter((f) => !nextByPath.has(f.path));
  const added = next.filter((f) => !prevByPath.has(f.path));
  const unchanged = prev.length - removed.length;

  const keyCounts = (fields: FormFieldSchema[], key: (f: FormFieldSchema) => string | null) => {
    const counts = new Map<string, number>();
    for (const f of fields) {
      const k = key(f);
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  };

  const renamed: Array<{ from: string; to: string }> = [];
  const claimedAdded = new Set<string>();
  const claimedRemoved = new Set<string>();

  for (const key of [
    (f: FormFieldSchema) => f.label ?? null,
    (f: FormFieldSchema) => lastSegment(f.path),
  ]) {
    const removedCounts = keyCounts(removed.filter((f) => !claimedRemoved.has(f.path)), key);
    const addedCounts = keyCounts(added.filter((f) => !claimedAdded.has(f.path)), key);
    for (const r of removed) {
      if (claimedRemoved.has(r.path)) continue;
      const k = key(r);
      if (!k || removedCounts.get(k) !== 1 || addedCounts.get(k) !== 1) continue;
      const match = added.find((a) => !claimedAdded.has(a.path) && key(a) === k);
      if (!match) continue;
      renamed.push({ from: r.path, to: match.path });
      claimedRemoved.add(r.path);
      claimedAdded.add(match.path);
    }
  }

  return {
    added: added.filter((f) => !claimedAdded.has(f.path)).map((f) => f.path),
    removed: removed.filter((f) => !claimedRemoved.has(f.path)).map((f) => f.path),
    renamed,
    unchanged,
  };
}
