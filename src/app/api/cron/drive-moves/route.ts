import { NextRequest, NextResponse } from "next/server";

import { runDriveMovesSweep } from "@/lib/cron/drive-moves";

// Manual trigger for the OneDrive move retry queue. The scheduled
// daily run goes through /api/cron/daily — Vercel Hobby tier allows
// only one cron entry, so vercel.json points there. Hitting this
// route directly is useful for clearing the queue after a Graph
// outage without waiting for the next daily tick.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await runDriveMovesSweep();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
