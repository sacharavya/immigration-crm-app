import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * The platform operator: the person who runs the SaaS, as distinct from the
 * staff of any firm using it.
 *
 * The separation is structural, not a role check. A platform admin has no
 * row in crm.staff, so crm.current_tenant_id() is NULL for them and every
 * tenant_isolation policy denies. They cannot read client, case, document
 * or financial data even by mistake — the database refuses, the portal
 * simply never asks.
 */
export type PlatformAdmin = {
  auth_user_id: string;
  email: string;
  full_name: string;
};

export const getPlatformAdmin = cache(
  async (): Promise<PlatformAdmin | null> => {
    const supabase = await createClient();

    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;
    if (!userId) return null;

    const { data } = await supabase
      .schema("platform")
      .from("admins")
      .select("auth_user_id, email, full_name")
      .eq("auth_user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    return data ?? null;
  },
);
