/**
 * Diagnostic: hit the same Supabase URL the app uses and print how
 * many active countries are in ref.countries plus a sample row.
 *
 * Run:  npx tsx --env-file=.env.local scripts/check-countries.ts
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  console.log("Connecting to:", url);

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, count, error } = await sb
    .schema("ref")
    .from("countries")
    .select("code, name, is_active", { count: "exact" })
    .order("name");

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  console.log("Total rows in ref.countries:", count);
  console.log("First 5:");
  for (const row of (data ?? []).slice(0, 5)) {
    console.log(`  ${row.code}  ${row.name}  active=${row.is_active}`);
  }
  console.log("Active (is_active = true) count:",
    (data ?? []).filter((r) => r.is_active).length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
