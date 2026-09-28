"use server";

import { getStaffTenantId, tenantForPortalToken } from "@/lib/tenant/context";
import { mintStagedUpload } from "@/lib/uploads/staged";
import type { UploadTarget } from "@/lib/uploads/types";

// The two doors into the staging bucket. Each proves who is asking, then
// hands back a one-time signed URL scoped to that firm.

/** A client on a portal page: the link's token is the credential. */
export async function mintPortalUpload(token: string): Promise<UploadTarget> {
  const tenantId = await tenantForPortalToken(token);
  if (!tenantId) return { error: "This link is no longer active." };
  try {
    return await mintStagedUpload(tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start upload." };
  }
}

/** A signed-in staff member. */
export async function mintStaffUpload(): Promise<UploadTarget> {
  const tenantId = await getStaffTenantId();
  if (!tenantId) return { error: "Not authenticated" };
  try {
    return await mintStagedUpload(tenantId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start upload." };
  }
}
