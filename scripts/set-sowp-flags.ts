/**
 * Set SOWP (Spousal Open Work Permit) eligibility flags on NOC occupations.
 *
 * Resets all flags to false, then marks TEER 2/3 occupations that appear
 * on IRCC's published eligible list as sowp_listed = true. Also updates
 * the sowp_list_version row's last_verified date.
 *
 * Run after a NOC data reimport or when IRCC updates the eligible list.
 *
 * Usage:
 *   npx tsx scripts/set-sowp-flags.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE env vars in .env.local");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  console.log("=== Set SOWP Eligibility Flags ===\n");
  const db = supabase();

  // 1. Reset all to false
  const { error: resetErr } = await db
    .schema("ref")
    .from("noc_occupations")
    .update({ sowp_listed: false })
    .neq("code", ""); // match all rows
  if (resetErr) throw new Error(`Reset failed: ${resetErr.message}`);
  console.log("Reset all sowp_listed to false.");

  // 2. Mark eligible TEER 2/3 occupations
  //
  // Eligible groups (IRCC, verified June 2026):
  //   TEER 2: 22xxx, 32xxx, 72xxx, 82xxx
  //   TEER 3: 33xxx, 73xxx, 83xxx
  //   Specific: 42102, 42202, 43100, 43204, 53200, 53201
  //
  // NOT eligible: 12xxx, 13xxx, 62xxx, 63xxx, 92xxx, 93xxx

  const patterns = [
    "22%", "32%", "72%", "82%", // TEER 2 groups
    "33%", "73%", "83%",        // TEER 3 groups
  ];
  const specificCodes = ["42102", "42202", "43100", "43204", "53200", "53201"];

  let marked = 0;

  // Mark by LIKE pattern
  for (const pattern of patterns) {
    const { data, error } = await db
      .schema("ref")
      .from("noc_occupations")
      .update({ sowp_listed: true })
      .like("code", pattern)
      .in("teer", [2, 3])
      .select("code");
    if (error) {
      console.error(`  Pattern ${pattern} failed:`, error.message);
    } else {
      marked += data?.length ?? 0;
    }
  }

  // Mark specific codes
  if (specificCodes.length > 0) {
    const { data, error } = await db
      .schema("ref")
      .from("noc_occupations")
      .update({ sowp_listed: true })
      .in("code", specificCodes)
      .in("teer", [2, 3])
      .select("code");
    if (error) {
      console.error("  Specific codes failed:", error.message);
    } else {
      marked += data?.length ?? 0;
    }
  }

  console.log(`Marked ${marked} occupations as SOWP-eligible.`);

  // 3. Update version record
  const today = new Date().toISOString().slice(0, 10);
  const { error: versionErr } = await db
    .schema("ref")
    .from("sowp_list_version")
    .update({
      last_verified: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (versionErr) {
    console.error("Version update failed:", versionErr.message);
  } else {
    console.log(`Updated last_verified to ${today}.`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
