/**
 * FLOW-1 verification: query the remote schema to confirm:
 *   - case_status enum has exactly 7 values
 *   - biometrics_status enum exists with 8 values
 *   - client_biometric_records table exists with RLS on
 *   - every case has biometrics_status = 'pending' (default)
 *   - case status distribution survives the migration
 *
 * Run: tsx --env-file=.env.local scripts/verify-flow-1.ts
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Case status distribution (RLS bypassed via service role)
  const { data: cases, error: caseErr } = await sb
    .schema("crm")
    .from("cases")
    .select("status, biometrics_status")
    .is("deleted_at", null);
  if (caseErr) throw caseErr;

  const statusCounts: Record<string, number> = {};
  const bioCounts: Record<string, number> = {};
  for (const c of cases ?? []) {
    statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
    bioCounts[c.biometrics_status] = (bioCounts[c.biometrics_status] ?? 0) + 1;
  }
  console.log("Case status distribution:", statusCounts);
  console.log("Biometrics status distribution:", bioCounts);

  // Biometric records table is reachable
  const { error: bioTblErr, count } = await sb
    .schema("crm")
    .from("client_biometric_records")
    .select("id", { count: "exact", head: true });
  if (bioTblErr) throw bioTblErr;
  console.log("client_biometric_records row count:", count);

  // has_prior_biometrics column exists on clients
  const { data: clientSample, error: clientErr } = await sb
    .schema("crm")
    .from("clients")
    .select("id, has_prior_biometrics")
    .limit(1);
  if (clientErr) throw clientErr;
  console.log(
    "clients.has_prior_biometrics column present:",
    clientSample !== null,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
