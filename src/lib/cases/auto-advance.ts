import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

// Server-only helper that flips a case from `retainer_pending` to
// `documentation_in_progress` the moment both Phase 1 gates pass —
// signed retainer + minimum payment received. Mirrors the gate logic
// already enforced by the crm.can_advance_phase RPC; we just call it
// proactively from any action that could plausibly satisfy a gate.
//
// Callers:
//   - recordPayment (cookie-based client, real staff actor)
//   - finishOnlineSignature / submitScannedDocument (service-role
//     client, null actor — public signing has no staff session)
//
// The helper does NOT revalidate paths; each caller already does that
// for its primary write. Failures are surfaced via the return value but
// must not roll back the caller's primary write.

type Client = SupabaseClient<Database>;

export type AutoAdvanceResult =
  | { advanced: false; reason: "not_pending" | "gate_blocked" | "lost_race" }
  | { advanced: true };

export async function tryAutoAdvanceFromRetainerPending(
  supabase: Client,
  caseId: string,
  actorStaffId: string | null,
): Promise<AutoAdvanceResult> {
  // Fast-path bail: most calls here are after a payment / signature
  // lands on a case that's already past Phase 1 (e.g. a top-up
  // payment). Skip the gate roundtrip in that case.
  const { data: caseRow } = await supabase
    .schema("crm")
    .from("cases")
    .select("status")
    .eq("id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caseRow || caseRow.status !== "retainer_pending") {
    return { advanced: false, reason: "not_pending" };
  }

  const { data: gate } = await supabase
    .schema("crm")
    .rpc("can_advance_phase", {
      p_case_id: caseId,
      p_target_status: "documentation_in_progress",
    });

  // RPC returns a TABLE(allowed, reason); supabase-js shapes that as an
  // array. Anything that isn't an explicit allow is a no-op.
  const allowed = Array.isArray(gate) && gate[0]?.allowed === true;
  if (!allowed) {
    return { advanced: false, reason: "gate_blocked" };
  }

  // Conditional UPDATE: the WHERE clause closes the race window. Two
  // concurrent calls can both reach this point, but only one returns a
  // row from the .select() because Postgres serialises the writes —
  // the second sees status already flipped and matches zero rows.
  const { data: moved } = await supabase
    .schema("crm")
    .from("cases")
    .update({ status: "documentation_in_progress" })
    .eq("id", caseId)
    .eq("status", "retainer_pending")
    .select("id")
    .maybeSingle();

  if (!moved) {
    return { advanced: false, reason: "lost_race" };
  }

  // Audit-trail event. Same shape as recordEvent's status_changed
  // entries, with `trigger: "auto"` so the activity timeline can later
  // render system advances distinctly if we want.
  await supabase
    .schema("crm")
    .from("case_events")
    .insert({
      case_id: caseId,
      event_type: "status_changed",
      event_data: {
        from: "retainer_pending",
        to: "documentation_in_progress",
        trigger: "auto",
      },
      description:
        "Auto-advanced: retainer signed and minimum payment received.",
      created_by: actorStaffId,
    });

  return { advanced: true };
}
