import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Agent = {
  id: string;
  name: string;
  organization: string | null;
  email: string | null;
  password_reset_required_at: string | null;
};

/**
 * Server-side referral-agent lookup, deduped per request via React.cache so
 * the (agent) layout and portal pages share one query. The agent identity is
 * SEPARATE from staff: an auth user is either a crm.staff row or a
 * crm.referral_agents row (mutual exclusion is enforced in the DB).
 *
 * Returns null when there's no auth user, no matching agent row, or the row is
 * soft-deleted / inactive. The (agent)/ layout redirects on null.
 */
export const getAgent = cache(async (): Promise<Agent | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .schema("crm")
    .from("referral_agents")
    .select("id, name, organization, email, is_active, password_reset_required_at")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row || !row.is_active) return null;

  return {
    id: row.id,
    name: row.name,
    organization: row.organization,
    email: row.email,
    password_reset_required_at: row.password_reset_required_at,
  };
});
