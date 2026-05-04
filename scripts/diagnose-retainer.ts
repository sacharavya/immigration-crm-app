/**
 * Diagnose why a case has no retainer row, and repair if missing.
 * Uses the service role so RLS doesn't get in the way.
 *
 * Run:  npx tsx --env-file=.env.local scripts/diagnose-retainer.ts
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. List live cases.
  const { data: cases, error: caseErr } = await sb
    .schema("crm")
    .from("cases")
    .select("id, case_number, created_at, created_by")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (caseErr) throw caseErr;
  console.log(`Live cases: ${cases?.length ?? 0}`);

  // 2. List live retainers.
  const { data: retainers, error: retErr } = await sb
    .schema("crm")
    .from("retainer_agreements")
    .select("id, case_id, status, created_at")
    .is("deleted_at", null);
  if (retErr) throw retErr;
  console.log(`Live retainers: ${retainers?.length ?? 0}`);

  const retainerByCase = new Map(
    (retainers ?? []).map((r) => [r.case_id, r]),
  );

  // 3. Find orphan cases.
  const orphans = (cases ?? []).filter((c) => !retainerByCase.has(c.id));
  console.log(`\nOrphan cases (no retainer): ${orphans.length}`);
  for (const c of orphans) {
    console.log(`  - ${c.case_number}  ${c.id}  created ${c.created_at}`);
  }

  if (orphans.length === 0) {
    console.log("\nAll cases have retainers. Refresh your browser to clear any client-side router cache.");
    return;
  }

  // 4. Repair.
  console.log("\nRepairing…");
  const inserts = orphans.map((c) => ({
    case_id: c.id,
    status: "draft" as const,
    created_by: c.created_by,
    created_at: c.created_at,
  }));
  const { error: insErr } = await sb
    .schema("crm")
    .from("retainer_agreements")
    .insert(inserts);
  if (insErr) {
    console.error("Insert failed:", insErr);
    process.exit(1);
  }
  console.log(`Inserted ${inserts.length} retainer row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
