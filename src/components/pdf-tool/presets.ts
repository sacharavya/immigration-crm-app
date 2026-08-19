// Size presets and small pure formatting helpers for the submission tool.
// Kept free of React/DOM so they unit-test under node:test.

export interface SizePreset {
  key: string;
  label: string;
  /**
   * Bytes the build must fit into. null = merge only (no recompression);
   * CUSTOM_TARGET marks the preset whose value the user types in.
   */
  targetBytes: number | null;
}

/** Sentinel targetBytes for the Custom preset - never sent to the engine. */
export const CUSTOM_TARGET = -1;

export const SIZE_PRESETS: ReadonlyArray<SizePreset> = [
  { key: "ircc-portal", label: "IRCC portal (4 MB)", targetBytes: 4_000_000 },
  {
    key: "portal-2mb",
    label: "Portals limited to 2 MB",
    targetBytes: 2_000_000,
  },
  { key: "oinp", label: "OINP e-Filing (10 MB)", targetBytes: 10_000_000 },
  { key: "custom", label: "Custom", targetBytes: CUSTOM_TARGET },
  { key: "merge-only", label: "Merge only", targetBytes: null },
];

/** Submission_Package_YYYY-MM-DD.pdf using the local calendar date. */
export function defaultFileName(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `Submission_Package_${y}-${m}-${d}.pdf`;
}

/**
 * Human-readable size in decimal units, matching how portals state their
 * limits (4 MB = 4,000,000 bytes).
 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  if (n < 1000) return `${Math.round(n)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  do {
    value /= 1000;
    unit += 1;
  } while (value >= 1000 && unit < units.length);
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit - 1]}`;
}
