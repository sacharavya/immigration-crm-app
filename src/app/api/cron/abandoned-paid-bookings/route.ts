import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { sendAbandonedBooking } from "@/lib/email/appointments";
import type { Database } from "@/lib/supabase/types";

// APPT-8 end-of-day sweep. Cancels paid consultations that landed in
// pending_payment more than 18 hours ago and never moved to
// awaiting_review (the client didn't upload). awaiting_review is
// DELIBERATELY EXCLUDED — staff must make the accept/reject call, never
// the cron. Same Bearer-token check as the reminder cron so this stays
// fail-closed if CRON_SECRET isn't configured.

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
  const cutoff = new Date(now.getTime() - 18 * 60 * 60 * 1000);

  const { data: abandoned, error } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id")
    .eq("status", "pending_payment")
    .is("deleted_at", null)
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error(
      "[cron.abandoned-paid-bookings] query failed",
      error,
    );
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  let cancelled = 0;
  let failed = 0;
  for (const row of abandoned ?? []) {
    const { error: updErr } = await supabase
      .schema("crm")
      .from("appointments")
      .update({
        status: "cancelled",
        cancellation_reason: "No payment proof received",
        cancelled_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (updErr) {
      console.error(
        "[cron.abandoned-paid-bookings] cancel update failed",
        row.id,
        updErr,
      );
      failed++;
      continue;
    }
    await sendAbandonedBooking(supabase, row.id);
    cancelled++;
  }

  return NextResponse.json({
    cancelled,
    failed,
    cutoff: cutoff.toISOString(),
  });
}
