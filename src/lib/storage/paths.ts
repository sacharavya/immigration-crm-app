/**
 * Pure path helpers for the storage layer. Kept out of settings.ts (which
 * is server-only) so they stay importable from tests.
 */

/**
 * Splits a configured root folder into sanitized path segments.
 *
 * "" yields no segments, meaning "anchor at the drive root". Blank
 * segments from sloppy input ("a//b", "a/ /b") are dropped, and "." /
 * ".." are refused outright so a saved typo can't walk the case tree out
 * of the folder the firm chose.
 */
export function rootFolderParts(
  rootFolder: string,
  sanitize: (name: string) => string,
): string[] {
  if (!rootFolder.trim()) return [];
  return rootFolder
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p !== "" && p !== "." && p !== "..")
    .map(sanitize)
    .filter(Boolean);
}
