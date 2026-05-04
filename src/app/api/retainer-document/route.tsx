import { NextResponse, type NextRequest } from "next/server";

import { renderRetainerHtml } from "@/components/retainer/retainer-document";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  loadRetainerData,
  RetainerRenderError,
} from "@/lib/pdf/render-retainer";

// Returns the retainer agreement as a full HTML document. Three callers:
//
//   1. Retainer tab on the case detail page — staff cookie auth.
//      Modes preview (default for draft) or final (for signed).
//   2. Public signing page — uses ?signing_token=<token>. Renders
//      mode='signing' (no watermark, empty client signature box).
//   3. Internal use by Puppeteer in /api/render-retainer-pdf — that
//      route bypasses this handler and renders inline via setContent
//      to avoid an extra round-trip + auth dance.
//
// Auth rules:
//   - signing_token present → look up retainer by token, render mode=signing
//   - cookie auth + manage_retainers → render mode=preview|final per ?mode
//   - otherwise → 401/403

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const retainerId = url.searchParams.get("retainerId");
  const signingToken = url.searchParams.get("signing_token");
  const requestedMode = url.searchParams.get("mode");

  // Path A: public signing flow via signing_token. We don't expose
  // retainerId-by-id lookup to anonymous callers — they must have a
  // valid signing token that maps to a retainer. RET-5 wires the token
  // creation; this route just validates whatever's stored.
  if (signingToken) {
    // Token-to-retainer resolution requires service role since RLS
    // blocks anonymous SELECT. Reuse loadRetainerData by first
    // resolving the id, then deferring to the standard loader.
    const id = await retainerIdFromToken(signingToken);
    if (!id) {
      return new NextResponse("Signing link not valid", { status: 404 });
    }
    return renderHtmlResponse(id, "signing");
  }

  // Path B: cookie-authenticated staff.
  const me = await getStaff();
  if (!me) {
    return new NextResponse("Not authenticated", { status: 401 });
  }
  if (!staffCan(me, "manage_retainers")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!retainerId) {
    return new NextResponse("retainerId is required", { status: 400 });
  }

  const mode =
    requestedMode === "final"
      ? "final"
      : requestedMode === "signing"
        ? "signing"
        : "preview";

  return renderHtmlResponse(retainerId, mode);
}

async function renderHtmlResponse(
  retainerId: string,
  mode: "preview" | "signing" | "final",
) {
  try {
    const data = await loadRetainerData(retainerId);
    const html = await renderRetainerHtml(data, mode);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof RetainerRenderError) {
      const status =
        err.code === "not_found"
          ? 404
          : err.code === "rcic_signature_missing" ||
              err.code === "data_incomplete"
            ? 422
            : 500;
      return new NextResponse(err.message, { status });
    }
    console.error("[retainer-document] unexpected error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

// Resolve a signing_token to a retainer id using the service role.
// Returns null when the token is unknown, expired, or attached to a
// retainer that's already been signed/voided.
async function retainerIdFromToken(token: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[retainer-document] service role env missing");
    return null;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await supabase
    .schema("crm")
    .from("retainer_agreements")
    .select("id, status, token_expires_at")
    .eq("signing_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  if (data.status === "void" || data.status === "expired") return null;
  if (
    data.token_expires_at &&
    new Date(data.token_expires_at).getTime() < Date.now()
  ) {
    return null;
  }
  return data.id;
}
