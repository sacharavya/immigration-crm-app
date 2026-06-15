import { NextRequest, NextResponse } from "next/server";

import { runAppointmentRemindersSweep } from "@/lib/cron/appointment-reminders";

// Standalone endpoint preserved so the sweep can still be triggered
// manually via HTTP (e.g. curl with the CRON_SECRET bearer). The
// scheduled daily run goes through /api/cron/daily instead — Vercel
// Hobby tier allows only one cron entry, so vercel.json points there.

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
    const result = await runAppointmentRemindersSweep();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
