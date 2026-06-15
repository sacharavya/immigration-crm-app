import { NextRequest, NextResponse } from "next/server";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  adminClient,
  getCasePortalActor,
} from "@/lib/auth/upload-portal";
import { streamFileFromGraph } from "@/lib/graph/download";

// Secure in-app file viewer. Streams document bytes from Microsoft
// Graph after authorizing against our own database. OneDrive URLs
// never reach the browser.
//
// Authorization model (per spec):
//   - Authenticate via dual-mode gate: staff session OR upload-portal
//     cookie (set by src/proxy.ts when the user first hits
//     /upload/<token>).
//   - Authorize against our database by internal file id:
//       staff   -> permission view_documents
//       portal  -> file's case_id must match the cookie's caseId
//   - Never trust Graph for authorization.
//
// Every failure mode returns 404 with an empty body so the route
// cannot be used as an existence / permission oracle.
//
// Every successful response inserts one crm.case_events row
// (event_type = 'document_viewed') before streaming begins, so a
// cancelled fetch still appears in the audit trail.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FILE_ID_RE = /^[0-9a-f-]{36}$/i;

// Types we serve as application/octet-stream + Content-Disposition:
// attachment to prevent inline script execution.
const ATTACHMENT_ONLY_MIME = new Set([
  "image/svg+xml",
  "text/html",
  "application/xhtml+xml",
  "text/xml",
  "application/xml",
]);

// Office source mimes we convert to PDF via Graph's format=pdf endpoint.
const OFFICE_MIME_TO_PDF = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  if (!FILE_ID_RE.test(fileId)) return notFound();

  // 1. Load the file row. Service-role bypasses RLS — this proxy is the
  //    authoritative authorization point.
  const admin = adminClient();
  const { data: doc, error } = await admin
    .schema("files")
    .from("documents")
    .select(
      "id, case_id, sharepoint_drive_id, sharepoint_item_id, file_name, mime_type, version_number, file_group_key",
    )
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !doc) return notFound();
  if (!doc.case_id) return notFound();
  if (!doc.sharepoint_drive_id || !doc.sharepoint_item_id) {
    return notFound();
  }

  // 2. Authorize. Try staff path first (cheaper — already have cookies
  //    in scope), then portal cookie. Both gate against this specific
  //    case_id, so a leaked cookie can only view files on the case it
  //    belongs to.
  let actorKind: "staff" | "portal";
  let actorId: string | null;
  const me = await getStaff();
  if (me && staffCan(me, "view_documents")) {
    actorKind = "staff";
    actorId = me.id;
  } else {
    const portal = await getCasePortalActor(doc.case_id);
    if (!portal) return notFound();
    actorKind = "portal";
    actorId = null;
  }

  // 3. Resolve serving mime + conversion strategy.
  const sourceMime = doc.mime_type ?? "application/octet-stream";
  const isAttachmentOnly = ATTACHMENT_ONLY_MIME.has(sourceMime);
  const isOfficeToPdf =
    !isAttachmentOnly && OFFICE_MIME_TO_PDF.has(sourceMime);

  // 4. Stream from Graph. Any failure -> 404 (no distinct error codes
  //    that could enable enumeration).
  let streamed;
  try {
    streamed = await streamFileFromGraph(
      doc.sharepoint_drive_id,
      doc.sharepoint_item_id,
      isOfficeToPdf ? { format: "pdf" } : {},
    );
  } catch (err) {
    console.error("[api/files] Graph fetch failed:", err);
    return notFound();
  }

  // 5. Compose response headers.
  const servedMime = isAttachmentOnly
    ? "application/octet-stream"
    : isOfficeToPdf
      ? "application/pdf"
      : streamed.contentType;

  const dispositionKind = isAttachmentOnly ? "attachment" : "inline";
  const fallbackName = `file-${doc.id.slice(0, 8)}`;
  const filename = doc.file_name ?? fallbackName;
  const encodedFilename = encodeURIComponent(filename);

  const headers = new Headers({
    "Content-Type": servedMime,
    "Content-Disposition": `${dispositionKind}; filename*=UTF-8''${encodedFilename}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  // CSP sandbox is applied ONLY for attachment-only types (SVG, HTML,
  // XML). For inline-renderable types (PDF, images) it would block
  // the browser's PDF viewer (which needs scripts) and serves no
  // additional purpose: those mimes can't execute attacker code, and
  // X-Content-Type-Options: nosniff prevents the browser from
  // re-interpreting them as something else.
  if (isAttachmentOnly) {
    headers.set("Content-Security-Policy", "sandbox");
  }
  if (streamed.contentLength) {
    headers.set("Content-Length", streamed.contentLength);
  }

  // 6. Audit. Inserted BEFORE the body is streamed so a cancelled
  //    fetch still gets logged. The case_events table has no UPDATE /
  //    DELETE policies so this row is immutable.
  await admin
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: doc.case_id,
      event_type: "document_viewed",
      event_data: {
        document_id: doc.id,
        file_group_key: doc.file_group_key,
        version_number: doc.version_number,
        actor_kind: actorKind,
        mime_served: servedMime,
      },
      description: `File viewed: ${filename} (v${doc.version_number})`,
      visible_to_client: false,
      created_by: actorId,
    });

  return new NextResponse(streamed.body, { status: 200, headers });
}
