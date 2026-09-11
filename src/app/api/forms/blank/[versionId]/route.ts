import { NextRequest, NextResponse } from "next/server";

import { getStaff } from "@/lib/auth/staff";
import { streamFileFromGraph } from "@/lib/graph/download";
import { createClient } from "@/lib/supabase/server";

// Streams a blank form version PDF from OneDrive to an authenticated staff
// browser. OneDrive URLs never reach the client. Any active staff member may
// read blanks (same rule as the form_versions RLS select policy). All
// failure modes return 404 so the route is not an existence oracle.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  if (!ID_RE.test(versionId)) return new NextResponse(null, { status: 404 });

  const me = await getStaff();
  if (!me) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  const { data: version } = await supabase
    .schema("crm")
    .from("form_versions")
    .select("sharepoint_drive_id, sharepoint_item_id, file_name")
    .eq("id", versionId)
    .maybeSingle();
  if (!version?.sharepoint_drive_id || !version.sharepoint_item_id) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const file = await streamFileFromGraph(
      version.sharepoint_drive_id,
      version.sharepoint_item_id,
    );
    return new NextResponse(file.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${(version.file_name ?? "form.pdf").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
