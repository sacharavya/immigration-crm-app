/**
 * One-shot: pick a documentation_in_progress case and run
 * can_advance_phase against documentation_review. Confirms the join
 * fix is live.
 *
 * Run:  tsx --env-file=.env.local scripts/verify-advance-gate.ts
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env");

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: cases } = await sb
    .schema("crm")
    .from("cases")
    .select("id, case_number, status")
    .eq("status", "documentation_in_progress")
    .is("deleted_at", null)
    .limit(5);

  if (!cases || cases.length === 0) {
    console.log("No documentation_in_progress cases in the DB.");
    return;
  }

  for (const c of cases) {
    const { data, error } = await sb
      .schema("crm")
      .rpc("can_advance_phase", {
        p_case_id: c.id,
        p_target_status: "documentation_review",
      });
    if (error) {
      console.log(`${c.case_number}: ERROR — ${error.message}`);
      continue;
    }
    const row = Array.isArray(data) ? data[0] : data;
    console.log(`${c.case_number}: allowed=${row?.allowed} reason=${row?.reason ?? "—"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
