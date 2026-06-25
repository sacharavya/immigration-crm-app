// Shared display + state helpers for the document checklist. Used by the staff
// case-page board and the client upload page so the two stay consistent in how
// they parse filenames, read a file's status, and derive a requirement's state.
//
// Filenames are composed on upload as "<documentCode>_<originalName>" for the
// first version, with a "_v<N>" suffix before the extension for later versions
// (see composeFileName in cases/[id]/actions.ts). The raw encoded string must
// never reach the UI; parseDocumentFileName recovers the original name and the
// version_number column is the source of truth for the badge.

export type FileDisplayStatus =
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "other";

export type RequirementState =
  | "not_uploaded"
  | "awaiting_review"
  | "needs_new_file"
  | "collected";

// Minimal shape the helpers need. Both call sites pass rows that satisfy this.
export type DisplayFile = {
  status: string;
  file_name: string | null;
  version_number: number;
};

/**
 * Recover the original filename + version from the encoded upload name.
 * Handles both the current "<code>_orig[_vN].ext" format and the more verbose
 * "<code>___vN__orig.ext" shape, and tidies stray underscores. The version
 * shown is always version_number (authoritative), not whatever is in the name.
 */
export function parseDocumentFileName(
  fileName: string | null,
  documentCode: string | null,
  versionNumber: number,
): { originalName: string; version: number } {
  if (!fileName) return { originalName: "file", version: versionNumber };

  let name = fileName;
  if (
    documentCode &&
    name.toLowerCase().startsWith(`${documentCode.toLowerCase()}_`)
  ) {
    name = name.slice(documentCode.length + 1);
  }

  const lastDot = name.lastIndexOf(".");
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  let base = lastDot > 0 ? name.slice(0, lastDot) : name;

  // Leading version marker ("__v1__orig") then trailing marker ("orig_v2").
  base = base.replace(/^_*v\d+_+/i, "");
  base = base.replace(/_v\d+$/i, "");
  base = base.replace(/^_+|_+$/g, "");

  const originalName = `${base}${ext}` || "file";
  return { originalName, version: versionNumber };
}

/** Map a DB document status to the four display states the UI cares about. */
export function fileStatus(status: string): FileDisplayStatus {
  if (status === "uploaded") return "awaiting_review";
  if (status === "accepted") return "approved";
  if (status === "rejected") return "rejected";
  return "other";
}

/**
 * Derive a requirement's overall state from its live (non-superseded) files.
 *
 * This is the reviewer's board, so an awaiting file outranks a rejected one:
 * if anything is waiting on review the reviewer should act now. Single-file
 * requirements (the common case) hold exactly one file, so there is no
 * conflict; the priority only matters for a multi-file slot that mixes
 * statuses, where the row still surfaces each file's own actions.
 */
export function deriveRequirementState(
  files: DisplayFile[] | undefined,
): RequirementState {
  if (!files || files.length === 0) return "not_uploaded";
  if (files.some((f) => f.status === "uploaded")) return "awaiting_review";
  if (files.some((f) => f.status === "rejected")) return "needs_new_file";
  if (files.some((f) => f.status === "accepted")) return "collected";
  return "not_uploaded";
}

/**
 * Whether a requirement counts as "received" for the case header count: at
 * least one live file is uploaded or accepted. Kept identical to the prior
 * itemReceived threshold so the header number does not move.
 */
export function itemReceived(files: DisplayFile[] | undefined): boolean {
  if (!files || files.length === 0) return false;
  return files.some(
    (f) => f.status === "uploaded" || f.status === "accepted",
  );
}
