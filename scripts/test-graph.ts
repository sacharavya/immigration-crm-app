/**
 * Microsoft Graph smoke test (OneDrive flow).
 *
 *   npm run graph:test
 *
 * 1. Loads .env.local (via Node's --env-file flag in the npm script).
 * 2. Acquires an app-only access token via client credentials.
 * 3. Fetches the OneDrive of the user named in GRAPH_ONEDRIVE_USER.
 * 4. Compares the drive id against GRAPH_DOCUMENT_LIBRARY_ID and reports.
 *
 * Exits non-zero on failure.
 */

import { getAccessToken } from "../src/lib/graph/auth";
import { graphFetch, GraphApiError } from "../src/lib/graph/client";

type Drive = {
  id: string;
  name: string;
  driveType: string;
  webUrl: string;
  quota?: { used: number; total: number };
  owner?: { user?: { displayName?: string; email?: string } };
};

type DriveItem = {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount?: number };
};

async function main(): Promise<void> {
  const userId = process.env.GRAPH_ONEDRIVE_USER;
  if (!userId) {
    throw new Error(
      "GRAPH_ONEDRIVE_USER is not set. Add the email or UPN of the user whose OneDrive the CRM should write to (e.g. info@genzdatalabs.com).",
    );
  }

  console.log("→ Acquiring access token…");
  const token = await getAccessToken();
  console.log(`  ok (token length ${token.length})`);

  console.log(`→ Fetching OneDrive for ${userId}…`);
  const drive = await graphFetch<Drive>(
    `/users/${encodeURIComponent(userId)}/drive`,
  );

  console.log();
  console.log(`  • ${drive.name}`);
  console.log(`      id:    ${drive.id}`);
  console.log(`      type:  ${drive.driveType}`);
  if (drive.owner?.user?.displayName) {
    console.log(`      owner: ${drive.owner.user.displayName}`);
  }
  console.log(`      url:   ${drive.webUrl}`);
  if (drive.quota) {
    const usedGb = (drive.quota.used / 1e9).toFixed(2);
    const totalGb = (drive.quota.total / 1e9).toFixed(2);
    console.log(`      quota: ${usedGb} / ${totalGb} GB`);
  }
  console.log();

  const configured = process.env.GRAPH_DOCUMENT_LIBRARY_ID;
  if (!configured) {
    console.log("⚠ GRAPH_DOCUMENT_LIBRARY_ID is not set.");
    console.log("  Paste the id above into .env.local:");
    console.log(`    GRAPH_DOCUMENT_LIBRARY_ID=${drive.id}`);
    console.log("  Then re-run npm run graph:test to confirm.");
    process.exit(1);
  }

  if (configured !== drive.id) {
    console.warn(
      "⚠ GRAPH_DOCUMENT_LIBRARY_ID does not match this user's drive.",
    );
    console.warn(`    configured: ${configured}`);
    console.warn(`    expected:   ${drive.id}`);
    process.exit(1);
  }

  console.log("✓ GRAPH_DOCUMENT_LIBRARY_ID matches this drive.");

  const rootFolder = process.env.GRAPH_ROOT_FOLDER?.trim();
  if (!rootFolder) {
    console.log(
      "  (No GRAPH_ROOT_FOLDER set — case folders will be created at drive root.)",
    );
    return;
  }

  console.log(`→ Verifying anchor folder "${rootFolder}" exists…`);
  const path = rootFolder
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  try {
    const item = await graphFetch<DriveItem>(
      `/drives/${configured}/root:/${path}`,
    );
    if (!item.folder) {
      console.error(
        `✗ "${rootFolder}" exists but is not a folder. Pick a folder name.`,
      );
      process.exit(1);
    }
    console.log(`✓ Found "${item.name}" — case folders will be created here.`);
    console.log(`    url: ${item.webUrl}`);
  } catch (err) {
    if (err instanceof GraphApiError && err.status === 404) {
      console.error(
        `✗ Folder "${rootFolder}" not found in this OneDrive. Create it first, or unset GRAPH_ROOT_FOLDER to use the drive root.`,
      );
    } else {
      throw err;
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("✗ graph:test failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
