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
