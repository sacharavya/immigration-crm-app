import { NextResponse } from "next/server";

import {
  renderRetainerPdf,
  RetainerRenderError,
} from "@/lib/pdf/render-retainer";
import { adminClient } from "@/lib/supabase/admin";

// Public download endpoint for the signing confirmation page. The
// signing page's submit action preserves signing_token after flipping
// status to 'signed' so this route can re-validate the token against
// the now-signed retainer. Only renders for status='signed' agreements
// — scanned uploads aren't streamed back from OneDrive in v1; clients
// who uploaded a scan are told the firm will email a copy.
//
// Single-use is still enforced for *signing*: the actions reject any
// submit when status != 'pending_signature'. The token here just
// authenticates the client to receive their own copy.

export const runtime = "nodejs";
export const maxDuration = 30;

type Props = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { token } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return new NextResponse("Invalid link", { status: 404 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse("Service not configured", { status: 500 });
  }

  const supabase = adminClient();

  const { data } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, status")
    .eq("signing_token", token)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data || data.status !== "signed") {
    return new NextResponse("This download link is no longer available.", {
      status: 404,
    });
  }

  try {
    const pdf = await renderRetainerPdf(data.id);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Retainer_Signed.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof RetainerRenderError) {
      return new NextResponse(err.message, {
        status: err.code === "not_found" ? 404 : 500,
      });
    }
    console.error("[signing/download] unexpected error:", err);
    return new NextResponse("Could not generate PDF.", { status: 500 });
  }
}
