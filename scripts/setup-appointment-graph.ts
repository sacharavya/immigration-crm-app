/**
 * Appointments Graph reachability check.
 *
 *   npm run appointments:check-graph
 *
 * Confirms the shared info@ calendar is readable via Microsoft Graph. Run
 * after the Application-type Calendars.ReadWrite permission is granted +
 * admin-consented in Azure. No code changes are needed when the permission
 * lands; this script just verifies the connection.
 */

import { getBusyIntervals } from "../src/lib/graph/calendar";

async function main() {
  console.log("Checking Graph calendar reachability...");
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 86400 * 1000);

  const busy = await getBusyIntervals(now.toISOString(), end.toISOString());
  console.log(`Found ${busy.length} busy events in the next 7 days.`);

  if (busy.length === 0) {
    console.log(
      "No busy events. This could mean an empty week OR that the " +
        "Graph permission is delegated (not application), or not yet " +
        "granted. Check Azure if you expect calendar events.",
    );
  } else {
    console.log("First few:");
    for (const b of busy.slice(0, 3)) {
      console.log(`  ${b.start} -> ${b.end}`);
    }
  }
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
