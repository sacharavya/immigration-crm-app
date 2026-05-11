import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import type { Role, StaffWithOverrides } from "./permissions";

/**
 * Server-side staff lookup, deduped per request via React.cache so that
 * the layout, page, and any nested server components share one query.
 *
 * Returns null when:
 *   - no auth user in the request
 *   - no matching staff row
 *   - the staff row is soft-deleted or inactive
 *
 * Pages that must have an authenticated, active staff member are inside
 * the (staff)/ route group whose layout already redirects on null. Pages
 * outside that group should treat null as "not authorised".
 */
export const getStaff = cache(async (): Promise<StaffWithOverrides | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row } = await supabase
    .schema("crm")
    .from("staff")
    .select(
      "id, role, first_name, last_name, email, permission_overrides, is_active, password_reset_required_at",
    )
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!row || !row.is_active) return null;

  return {
    id: row.id,
    role: row.role as Role,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    permission_overrides:
      (row.permission_overrides as Record<string, boolean> | null) ?? {},
    password_reset_required_at: row.password_reset_required_at,
  };
});
