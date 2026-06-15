import { createClient as createServiceClient } from "@supabase/supabase-js";

import { sendAppointmentReminder } from "@/lib/email/appointments";
import type { Database } from "@/lib/supabase/types";

// Reusable sweep for the daily appointment-reminder job. Pulled out
// of the route handler so the consolidated daily cron can invoke it
// alongside the abandoned-bookings + drive-moves sweeps without
// going through HTTP.
//
// Behavior (unchanged from the original route):
//   - 30h look-ahead window so the next daily tick still catches an
//     appointment created shortly after the prior tick.
//   - reminder_email_sent_at NULL dedup so each appointment is
//     reminded at most once regardless of overlapping windows.

export type ReminderSweepResult = {
  sent: number;
  failed: number;
  window_start: string;
  window_end: string;
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

export async function runAppointmentRemindersSweep(): Promise<ReminderSweepResult> {
  const supabase = adminClient();
  const now = new Date();
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
    throw new Error("query_failed");
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

  return {
    sent,
    failed,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
  };
}
