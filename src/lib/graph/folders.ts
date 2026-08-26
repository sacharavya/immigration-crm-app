import { createClient } from "@/lib/supabase/server";

import { GraphApiError, graphFetch } from "./client";

type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount?: number };
};

export type CaseFolderResult = {
  driveItemId: string;
  webUrl: string;
};

/**
 * Creates the case folder hierarchy in the firm's SharePoint document
 * library and returns the case folder's drive item id + web URL.
 *
 * Hierarchy (relative to the configured library root):
 *   {Year}/
 *     {ClientNumber} {LastName, FirstName}/
 *       {CaseNumber} {ServiceName}/
 *         {Category subfolders from ref.template_documents}
 *
 * Idempotent: if any folder along the path already exists it is reused
 * rather than re-created.
 */
export async function createCaseFolderStructure(
  caseId: string,
): Promise<CaseFolderResult> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }

  const supabase = await createClient();

  const { data: caseRow, error } = await supabase
    .schema("crm")
    .from("cases")
    .select(
      `
        id,
        case_number,
        opened_at,
        service_type_id,
        service_template_id,
        client:clients(client_number, legal_name_full, family_name, given_names)
      `,
    )
    .eq("id", caseId)
    .is("deleted_at", null)
    .single();

  if (error || !caseRow) {
    throw new Error(`Case ${caseId} not found: ${error?.message ?? "no row"}`);
  }

  // Cross-schema embed (cases→ref.service_types) doesn't type-infer in
  // supabase-js, so fetch the service name separately.
  const { data: service } = await supabase
    .schema("ref")
    .from("service_types")
    .select("name")
    .eq("id", caseRow.service_type_id)
    .single();

  const { data: templateDocs, error: tdErr } = await supabase
    .schema("ref")
    .from("template_documents")
    .select("group_code")
    .eq("service_template_id", caseRow.service_template_id);

  if (tdErr) {
    throw new Error(`Could not load template groups: ${tdErr.message}`);
  }

  const groupCodes = [
    ...new Set((templateDocs ?? []).map((d) => d.group_code)),
  ];

  // ref.checklist_groups replaced ref.document_categories. Same shape, same
  // seeded names — the OneDrive folder structure is unchanged because the
  // group names ("01 Identity", "02 Education", ...) match what the old
  // categories produced.
  const { data: categories } = await supabase
    .schema("ref")
    .from("checklist_groups")
    .select("code, name, display_order")
    .in("code", groupCodes)
    .order("display_order");

  const year = new Date(caseRow.opened_at).getFullYear().toString();

  const lastName =
    caseRow.client?.family_name?.trim() ||
    caseRow.client?.legal_name_full?.split(/\s+/).slice(-1).join(" ") ||
    "";
  const firstName =
    caseRow.client?.given_names?.trim() ||
    caseRow.client?.legal_name_full?.split(/\s+/).slice(0, -1).join(" ") ||
    "";

  const clientFolder = sanitize(
    `${caseRow.client?.client_number ?? ""} ${lastName}, ${firstName}`.trim(),
  );
  const caseFolder = sanitize(
    `${caseRow.case_number} ${service?.name ?? ""}`.trim(),
  );

  // Optional sandbox/anchor folder. Treated as a path so nested values like
  // "Sandbox/CRM-tests" work; unset means anchor at drive root.
  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim() ?? "";
  const rootParts = rootFolder
    ? rootFolder.split("/").map((p) => p.trim()).filter(Boolean).map(sanitize)
    : [];

  const pathParts = [...rootParts, year, clientFolder, caseFolder].filter(
    Boolean,
  );

  const root = await graphFetch<DriveItem>(`/drives/${driveId}/root`);
  let parent: DriveItem = root;
  for (const part of pathParts) {
    parent = await ensureFolder(driveId, parent.id, part);
  }

  // RET-4: "00 Retainer" + the N category subfolders are all siblings of
  // the case folder, so create them in parallel. The numeric prefix on
  // "00 Retainer" still pins it at the top of the OneDrive listing.
  await Promise.all([
    ensureFolder(driveId, parent.id, "00 Retainer"),
    ...(categories ?? []).map((cat) =>
      ensureFolder(driveId, parent.id, sanitize(cat.name)),
    ),
  ]);

  return { driveItemId: parent.id, webUrl: parent.webUrl };
}

/**
 * Returns the case folder + the "00 Retainer" subfolder, creating the
 * subfolder lazily if it doesn't exist yet (older cases provisioned
 * before RET-4 won't have it). Used by the upload-signed-retainer
 * action.
 */
export async function ensureCaseRetainerFolder(
  caseFolderItemId: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }
  const folder = await ensureFolder(driveId, caseFolderItemId, "00 Retainer");
  return { driveId, folderItemId: folder.id };
}

/**
 * Returns the case folder's "Final" subfolder, creating it lazily. Finished
 * submission packages built by the PDF tool land here.
 */
export async function ensureCaseFinalFolder(
  caseFolderItemId: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }
  const folder = await ensureFolder(driveId, caseFolderItemId, "Final");
  return { driveId, folderItemId: folder.id };
}

/**
 * Returns the drive id + the parent item id of the
 * "Consultation Payments/{year}" folder, creating the path lazily.
 * Consultation bookings have no case folder yet, so e-transfer screenshots
 * live under GRAPH_ROOT_FOLDER/Consultation Payments/{year}/.
 */
export async function ensureConsultationPaymentsFolder(
  year: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }

  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim() ?? "";
  const rootParts = rootFolder
    ? rootFolder.split("/").map((p) => p.trim()).filter(Boolean).map(sanitize)
    : [];

  const root = await graphFetch<DriveItem>(`/drives/${driveId}/root`);
  let parent: DriveItem = root;
  for (const part of rootParts) {
    parent = await ensureFolder(driveId, parent.id, part);
  }
  parent = await ensureFolder(driveId, parent.id, "Consultation Payments");
  parent = await ensureFolder(driveId, parent.id, sanitize(year));
  return { driveId, folderItemId: parent.id };
}

// Signed Initial Consultation Agreements. Separate tree from case retainers
// (appointment-only clients have no case folder) and from payment proofs, so
// staff can find agreements on their own.
export async function ensureConsultationAgreementsFolder(
  year: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }

  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim() ?? "";
  const rootParts = rootFolder
    ? rootFolder.split("/").map((p) => p.trim()).filter(Boolean).map(sanitize)
    : [];

  const root = await graphFetch<DriveItem>(`/drives/${driveId}/root`);
  let parent: DriveItem = root;
  for (const part of rootParts) {
    parent = await ensureFolder(driveId, parent.id, part);
  }
  parent = await ensureFolder(driveId, parent.id, "Consultation Agreements");
  parent = await ensureFolder(driveId, parent.id, sanitize(year));
  return { driveId, folderItemId: parent.id };
}

/**
 * Returns the drive id + a "99 Rejected" subfolder under the given
 * parent folder, creating it lazily. The numeric "99 " prefix sorts
 * it to the BOTTOM of the parent's listing so staff browsing OneDrive
 * don't confuse it with active documents in the same group.
 *
 * The parent is typically the case's category folder
 * (e.g. "01 Identity"), so rejected files stay co-located with their
 * active siblings — staff browsing "01 Identity" can find the
 * rejected version right inside "01 Identity/99 Rejected". A caller
 * is also free to pass the case folder if they want a case-wide
 * Rejected bucket, but the per-group placement is the default.
 *
 * Re-uploads move the prior (rejected) Graph item into this folder
 * + rename it with a date suffix so OneDrive mirrors the DB state.
 * The move is best-effort; failures get queued to
 * files.pending_drive_moves.
 */
export async function ensureRejectedFolderUnder(
  parentFolderItemId: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }
  const folder = await ensureFolder(driveId, parentFolderItemId, "99 Rejected");
  return { driveId, folderItemId: folder.id };
}

/**
 * Returns the case folder + the "00 Payments" subfolder, creating the
 * subfolder lazily if it doesn't exist yet. Same numeric "00 " prefix
 * pattern as 00 Retainer so both pin to the top of the case folder
 * listing in OneDrive.
 */
export async function ensureCasePaymentsFolder(
  caseFolderItemId: string,
): Promise<{ driveId: string; folderItemId: string }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }
  const folder = await ensureFolder(driveId, caseFolderItemId, "00 Payments");
  return { driveId, folderItemId: folder.id };
}

/**
 * Returns the case's category subfolder (e.g. "01 Identity"), creating
 * it under the case root if it doesn't exist yet.
 *
 * Self-healing for the case where staff added a new category to an
 * active template AFTER a case was already provisioned: the original
 * provisioner only ran at case-creation time, so the new category's
 * subfolder is missing from OneDrive. Calling this on every category
 * upload makes the structure heal on first use, with no backfill or
 * background job.
 *
 * The categoryName must match exactly what createCaseFolderStructure
 * would have used at provisioning time — i.e. sanitize(group.name)
 * from ref.checklist_groups. Callers can pass the raw group.name;
 * sanitize is applied internally to keep both paths in sync.
 */
export async function ensureCaseCategoryFolder(
  caseFolderItemId: string,
  categoryName: string,
): Promise<{ driveId: string; folderItemId: string; wasCreated: boolean }> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }
  const name = sanitize(categoryName);
  // findChildFolder first so we can report wasCreated honestly (useful
  // for logs + the backfill script). ensureFolder would do the same
  // probe internally but doesn't return create-vs-found.
  const existing = await findChildFolder(driveId, caseFolderItemId, name);
  if (existing) {
    return {
      driveId,
      folderItemId: existing.id,
      wasCreated: false,
    };
  }
  const created = await ensureFolder(driveId, caseFolderItemId, name);
  // Visibility: lazy provisioning is the symptom of a mid-case template
  // edit, which the firm wants to know about. Cheap log, easy to grep.
  console.log(
    "[onedrive.lazy-provision]",
    JSON.stringify({
      case_folder_item_id: caseFolderItemId,
      category_name: name,
      new_folder_id: created.id,
    }),
  );
  return {
    driveId,
    folderItemId: created.id,
    wasCreated: true,
  };
}

/**
 * Returns the named child folder under `parentItemId`, creating it if it
 * doesn't exist. Idempotent under a single caller; concurrent callers
 * racing on the same name should get one survivor via the 409 fallback.
 */
/**
 * Returns the drive id + the parent item id of the "Staff Signatures"
 * folder, creating the folder under the configured GRAPH_ROOT_FOLDER (if
 * any) when missing. Used by the staff signature settings page.
 */
export async function ensureStaffSignaturesFolder(): Promise<{
  driveId: string;
  folderItemId: string;
}> {
  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) {
    throw new Error("GRAPH_DOCUMENT_LIBRARY_ID is not set");
  }

  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim() ?? "";
  const rootParts = rootFolder
    ? rootFolder.split("/").map((p) => p.trim()).filter(Boolean).map(sanitize)
    : [];

  const root = await graphFetch<DriveItem>(`/drives/${driveId}/root`);
  let parent: DriveItem = root;
  for (const part of rootParts) {
    parent = await ensureFolder(driveId, parent.id, part);
  }
  parent = await ensureFolder(driveId, parent.id, "Staff Signatures");
  return { driveId, folderItemId: parent.id };
}

async function ensureFolder(
  driveId: string,
  parentItemId: string,
  name: string,
): Promise<DriveItem> {
  const existing = await findChildFolder(driveId, parentItemId, name);
  if (existing) return existing;

  try {
    return await graphFetch<DriveItem>(
      `/drives/${driveId}/items/${parentItemId}/children`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail",
        }),
      },
    );
  } catch (err) {
    if (err instanceof GraphApiError && err.status === 409) {
      const found = await findChildFolder(driveId, parentItemId, name);
      if (found) return found;
    }
    throw err;
  }
}

async function findChildFolder(
  driveId: string,
  parentItemId: string,
  name: string,
): Promise<DriveItem | null> {
  // Filter on name; $select keeps the payload small.
  const escaped = name.replace(/'/g, "''");
  const list = await graphFetch<{ value: DriveItem[] }>(
    `/drives/${driveId}/items/${parentItemId}/children?$select=id,name,webUrl,folder&$filter=name eq '${encodeURIComponent(escaped)}'`,
  );
  return list.value.find((i) => i.folder && i.name === name) ?? null;
}

function sanitize(name: string): string {
  // SharePoint disallows: \ / : * ? " < > | and trailing/leading dots/spaces
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .trim();
}
