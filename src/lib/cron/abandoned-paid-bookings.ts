import { createClient as createServiceClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";

import { sendAbandonedBooking } from "@/lib/email/appointments";
import type { Database } from "@/lib/supabase/types";

// Reusable sweep for the end-of-day abandoned-bookings job.
// Cancels paid consultations that have been stuck in pending_payment
// past midnight Toronto time without ever advancing to awaiting_review.
// awaiting_review is INTENTIONALLY EXCLUDED — staff must make the
// accept/reject call, never the cron.
//
// "12:00 AM beginning of today" in America/Toronto is the cutoff: any
// pending_payment row created before that instant is abandoned. This is
// universal — applies to both public-portal and staff-booked paid
// consultations.

const FIRM_TZ = "America/Toronto";

export type AbandonedBookingsResult = {
  cancelled: number;
  failed: number;
  cutoff: string;
};

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

export async function runAbandonedPaidBookingsSweep(): Promise<AbandonedBookingsResult> {
  const supabase = adminClient();

  // Midnight at the beginning of today in the firm's timezone, converted
  // to a UTC instant. Any pending_payment created before this is stale.
  const todayInToronto = new Date().toLocaleDateString("en-CA", {
    timeZone: FIRM_TZ,
  }); // "YYYY-MM-DD"
  const cutoff = fromZonedTime(`${todayInToronto}T00:00:00`, FIRM_TZ);

  const { data: abandoned, error } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id")
    .eq("status", "pending_payment")
    .is("deleted_at", null)
    .lt("created_at", cutoff.toISOString());

  if (error) {
    console.error("[cron.abandoned-paid-bookings] query failed", error);
    throw new Error("query_failed");
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

  return {
    cancelled,
    failed,
    cutoff: cutoff.toISOString(),
  };
}
