import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import {
  renderRetainerPdf,
  RetainerRenderError,
} from "@/lib/pdf/render-retainer";

// Vercel runtime config — Chromium can't run on Edge.
export const runtime = "nodejs";
// PDF render takes ~2-3s cold start + ~1s per page. 30s ceiling
// requires Vercel Pro; Hobby caps at 10s and would need to be lowered.
export const maxDuration = 30;

const bodySchema = z.object({
  retainerId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  // Auth: only logged-in staff with manage_retainers may trigger PDF
  // generation from the case detail Retainer tab. The public signing
  // flow (RET-5+) calls renderRetainerPdf() directly from the signing
  // server action with its own token check, not via this route.
  const me = await getStaff();
  if (!me) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!staffCan(me, "manage_retainers")) {
    return NextResponse.json(
      { error: "You don't have permission to generate retainer PDFs." },
      { status: 403 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    parsed = result.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const pdf = await renderRetainerPdf(parsed.retainerId);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="retainer-${parsed.retainerId}.pdf"`,
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
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    console.error("[render-retainer-pdf] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
