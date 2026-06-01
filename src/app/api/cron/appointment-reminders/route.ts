import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { sendAppointmentReminder } from "@/lib/email/appointments";
import type { Database } from "@/lib/supabase/types";

// Daily cron driven by vercel.json's "crons" entry (Vercel Hobby tier
// caps schedules at one per day). Vercel attaches
// `Authorization: Bearer ${CRON_SECRET}` automatically to scheduled
// invocations; reject anything that doesn't carry it.
//
// Each daily run sweeps appointments whose starts_at falls in the next
// ~30 hours. The window is wider than 24h so an appointment scheduled
// shortly after one run still gets caught by the next day's run. The
// reminder_email_sent_at NULL check de-duplicates so each appointment
// only ever receives one reminder regardless of overlapping windows.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  if (!expected) {
    // Fail closed when the secret is not configured to avoid a public cron
    // endpoint by accident.
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = adminClient();
  const now = new Date();
  // Look ahead 30 hours. Daily cadence + 30h horizon + NULL dedup gives
  // every appointment exactly one reminder, fired between 0 and ~30h
  // before the start time (average ~24h).
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + 30 * 60 * 60 * 1000);

  const { data: upcoming, error } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id")
    .eq("status", "confirmed")
    .is("reminder_email_sent_at", null)
    .is("deleted_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lt("starts_at", windowEnd.toISOString());

  if (error) {
    console.error("[cron.appointment-reminders] query failed", error);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  for (const row of upcoming ?? []) {
    const result = await sendAppointmentReminder(supabase, row.id);
    if (result.ok) {
      await supabase
        .schema("crm")
        .from("appointments")
        .update({ reminder_email_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } else {
      console.warn(
        "[cron.appointment-reminders] reminder failed",
        row.id,
        result.reason,
      );
      failed++;
    }
  }

  return NextResponse.json({
    sent,
    failed,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
  });
}
