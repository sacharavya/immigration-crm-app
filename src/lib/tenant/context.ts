import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Which firm is this request for?
 *
 * There are two answers, and they come from different places:
 *
 *   Staff pages       — the signed-in staff member's own tenant. Reads and
 *                       writes through the session client are already
 *                       constrained to it by RLS, so this is mostly needed
 *                       when the code has to reach for the service role.
 *
 *   Public pages      — booking, contact, NOC finder. No session exists, so
 *                       the firm is identified by the host the request
 *                       arrived on. A deployment serving a single firm
 *                       resolves unambiguously without any subdomain.
 */

/** The signed-in staff member's tenant, or null if not staff. */
export const getStaffTenantId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .schema("crm")
    .from("staff")
    .select("tenant_id")
    .eq("auth_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  return data?.tenant_id ?? null;
});

/**
 * The tenant a public request belongs to, from the request host.
 *
 * Returns null when the host matches no firm AND more than one firm is
 * active — ambiguous, and guessing would show one firm's booking page
 * under another firm's domain. Callers render a "not found" in that case.
 */
export const getPublicTenantId = cache(async (): Promise<string | null> => {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";

  const { data, error } = await adminClient()
    .schema("crm")
    .rpc("tenant_for_host", { p_host: host });

  if (error) return null;
  return (data as string | null) ?? null;
});

/**
 * Tenant for a request that may be either. Staff wins, because a staff
 * member browsing their own firm's public pages should see their own firm
 * regardless of which host they typed.
 */
export async function getTenantId(): Promise<string | null> {
  return (await getStaffTenantId()) ?? (await getPublicTenantId());
}

/** Throws rather than silently writing a row into the wrong firm. */
export async function requireTenantId(): Promise<string> {
  const id = await getTenantId();
  if (!id) {
    throw new Error(
      "No tenant could be resolved for this request. A public page needs a " +
        "host matching a firm's slug or custom domain.",
    );
  }
  return id;
}

/**
 * The signed-in staff member's tenant, or a thrown error.
 *
 * Used where a service-role call is about to write or reach an external
 * drive on the firm's behalf: without a tenant the only alternatives are
 * guessing or silently acting on another firm's data, so failing is right.
 */
export async function requireStaffTenantId(): Promise<string> {
  const id = await getStaffTenantId();
  if (!id) {
    throw new Error(
      "No staff session, so no tenant could be resolved for a firm-scoped operation.",
    );
  }
  return id;
}
