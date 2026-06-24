import { createClient as createServiceClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Service-role Supabase client. Bypasses RLS — use only in trusted
 * server contexts (server actions, route handlers, cron jobs, portal
 * token flows) where access is gated by application logic, never in
 * code reachable from the browser.
 *
 * Centralised here so the security-sensitive hardening flags
 * (autoRefreshToken / persistSession off) live in exactly one place.
 */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
