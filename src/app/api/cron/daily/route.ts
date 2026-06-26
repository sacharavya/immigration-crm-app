import { NextRequest, NextResponse } from "next/server";

import { runAbandonedPaidBookingsSweep } from "@/lib/cron/abandoned-paid-bookings";
import { runAppointmentRemindersSweep } from "@/lib/cron/appointment-reminders";
import { verifyCronAuth } from "@/lib/cron/auth";
import { runDriveMovesSweep } from "@/lib/cron/drive-moves";
import { runFirmMetricsSnapshotSweep } from "@/lib/cron/firm-metrics";

// Consolidated daily cron. Vercel Hobby tier allows exactly ONE
// scheduled cron, so we run all four sweeps behind a single entry in
// vercel.json:
//   1. appointment-reminders: send reminder emails for confirmed
//      appointments starting in the next ~30h
//   2. abandoned-paid-bookings: cancel paid consultations that
//      lingered in pending_payment for >18h without ever advancing
//   3. drive-moves: retry queued OneDrive moves for rejected files
//      that failed the inline best-effort move at re-upload time
//   4. firm-metrics: snapshot today's firm KPIs into
//      analytics.firm_metric_daily for the dashboard sparklines
//
// Failures in one sweep don't abort the others — each runs in its
// own try/catch and contributes its result (or an error string) to
// the combined response body.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const [reminders, abandoned, driveMoves, firmMetrics] =
    await Promise.allSettled([
      runAppointmentRemindersSweep(),
      runAbandonedPaidBookingsSweep(),
      runDriveMovesSweep(),
      runFirmMetricsSnapshotSweep(),
    ]);

  return NextResponse.json({
    appointment_reminders: settled(reminders),
    abandoned_paid_bookings: settled(abandoned),
    drive_moves: settled(driveMoves),
    firm_metrics_snapshot: settled(firmMetrics),
  });
}

function settled<T>(r: PromiseSettledResult<T>): T | { error: string } {
  if (r.status === "fulfilled") return r.value;
  return {
    error: r.reason instanceof Error ? r.reason.message : String(r.reason),
  };
}
