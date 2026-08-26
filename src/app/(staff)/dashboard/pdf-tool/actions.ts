"use server";

import { z } from "zod";

import { getStaff } from "@/lib/auth/staff";
import { graphFetch } from "@/lib/graph/client";
import { createClient } from "@/lib/supabase/server";

// Mints a short-lived, pre-authenticated OneDrive download URL for a case
// document. The browser fetches the bytes DIRECTLY from Microsoft with it,
// so document content never transits our server (compliance rule); this
// action only ever handles metadata.
export async function getCaseDocumentDownloadUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  if (!z.string().uuid().safeParse(documentId).success) {
    return { error: "Invalid document id" };
  }
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .schema("files")
    .from("documents")
    .select("id, sharepoint_drive_id, sharepoint_item_id")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc?.sharepoint_drive_id || !doc.sharepoint_item_id) {
    return { error: "Document not found or not stored in OneDrive." };
  }

  try {
    const item = await graphFetch<{
      "@microsoft.graph.downloadUrl"?: string;
    }>(
      `/drives/${doc.sharepoint_drive_id}/items/${doc.sharepoint_item_id}?$select=id,content.downloadUrl`,
    );
    const url = item["@microsoft.graph.downloadUrl"];
    if (!url) return { error: "Microsoft did not return a download URL." };
    return { url };
  } catch (err) {
    console.error("[pdf-tool] downloadUrl fetch failed:", err);
    return { error: "Could not reach OneDrive for this document." };
  }
}

// ---------------------------------------------------------------------------
// Case folder browsing: the editor sidebar shows the case's REAL OneDrive
// folder tree (files and folders), not just the files.documents rows. Listing
// and URL-minting are metadata-only; bytes always flow browser-to-Microsoft.
// Both actions validate the target lives INSIDE the case's folder so a token
// for one case can never walk another case's tree.
// ---------------------------------------------------------------------------

export interface CaseDriveItem {
  id: string;
  name: string;
  kind: "folder" | "file";
  mime: string | null;
  sizeBytes: number;
  childCount: number;
  /** Pre-authenticated Microsoft thumbnail URL (short-lived); null when
   *  Graph has not generated one. Loaded browser-to-Microsoft directly. */
  thumbnailUrl: string | null;
}

type GraphChild = {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
  parentReference?: { path?: string; driveId?: string };
  thumbnails?: Array<
    Record<string, { url?: string } | undefined>
  >;
};

async function caseFolderContext(
  caseId: string,
): Promise<
  | { driveId: string; folderId: string; folderPath: string }
  | { error: string }
> {
  if (!z.string().uuid().safeParse(caseId).success) {
    return { error: "Invalid case id" };
  }
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };

  const driveId = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!driveId) return { error: "Document library not configured" };

  const supabase = await createClient();
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, sharepoint_folder_id")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow?.sharepoint_folder_id) {
    return { error: "Case has no OneDrive folder yet." };
  }

  try {
    const folder = await graphFetch<GraphChild>(
      `/drives/${driveId}/items/${caseRow.sharepoint_folder_id}?$select=id,name,parentReference`,
    );
    const folderPath = `${folder.parentReference?.path ?? ""}/${folder.name}`;
    return { driveId, folderId: caseRow.sharepoint_folder_id, folderPath };
  } catch (err) {
    console.error("[pdf-tool] case folder lookup failed:", err);
    return { error: "Could not reach the case folder." };
  }
}

/** True when the item sits inside (or is) the case folder. */
function isInsideCaseFolder(
  item: GraphChild,
  ctx: { folderId: string; folderPath: string },
): boolean {
  if (item.id === ctx.folderId) return true;
  const path = item.parentReference?.path ?? "";
  return path === ctx.folderPath || path.startsWith(`${ctx.folderPath}/`);
}

export async function listCaseFolderChildren(
  caseId: string,
  folderItemId?: string,
): Promise<{ items: CaseDriveItem[] } | { error: string }> {
  const ctx = await caseFolderContext(caseId);
  if ("error" in ctx) return ctx;

  const targetId = folderItemId ?? ctx.folderId;
  try {
    if (targetId !== ctx.folderId) {
      const target = await graphFetch<GraphChild>(
        `/drives/${ctx.driveId}/items/${targetId}?$select=id,name,parentReference`,
      );
      if (!isInsideCaseFolder(target, ctx)) {
        return { error: "Folder is outside this case." };
      }
    }
    const res = await graphFetch<{ value: GraphChild[] }>(
      `/drives/${ctx.driveId}/items/${targetId}/children?$select=id,name,size,file,folder&$expand=thumbnails($select=c480x640,large,medium,small)&$top=200`,
    );
    const items: CaseDriveItem[] = (res.value ?? [])
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.folder ? ("folder" as const) : ("file" as const),
        mime: c.file?.mimeType ?? null,
        sizeBytes: Number(c.size ?? 0),
        childCount: c.folder?.childCount ?? 0,
        thumbnailUrl:
          c.thumbnails?.[0]?.["c480x640"]?.url ??
          c.thumbnails?.[0]?.large?.url ??
          c.thumbnails?.[0]?.medium?.url ??
          c.thumbnails?.[0]?.small?.url ??
          null,
      }))
      .sort((a, b) =>
        a.kind !== b.kind
          ? a.kind === "folder"
            ? -1
            : 1
          : a.name.localeCompare(b.name),
      );
    return { items };
  } catch (err) {
    console.error("[pdf-tool] folder listing failed:", err);
    return { error: "Could not list the folder." };
  }
}

export async function getCaseDriveFileDownloadUrl(
  caseId: string,
  itemId: string,
): Promise<{ url: string } | { error: string }> {
  const ctx = await caseFolderContext(caseId);
  if ("error" in ctx) return ctx;
  try {
    const item = await graphFetch<
      GraphChild & { "@microsoft.graph.downloadUrl"?: string }
    >(
      `/drives/${ctx.driveId}/items/${itemId}?$select=id,name,parentReference,content.downloadUrl`,
    );
    if (!isInsideCaseFolder(item, ctx)) {
      return { error: "File is outside this case." };
    }
    const url = item["@microsoft.graph.downloadUrl"];
    if (!url) return { error: "Microsoft did not return a download URL." };
    return { url };
  } catch (err) {
    console.error("[pdf-tool] drive file url failed:", err);
    return { error: "Could not reach OneDrive for this file." };
  }
}
