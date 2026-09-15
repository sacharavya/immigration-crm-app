import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

import {
  AccessRequestsTable,
  type AccessRequest,
} from "../_components/access-requests-table";

export const dynamic = "force-dynamic";

export default async function AccessRequestsPage() {
  const supabase = await createClient();

  // The B2B signup funnel is the platform's own, so it is readable here and
  // nowhere else; RLS restricts it to platform.is_admin(). Untyped client
  // because the table is newer than the generated Database types.
  const { data } = await (supabase as unknown as SupabaseClient)
    .schema("crm")
    .from("software_access_requests")
    .select(
      "id, firm_name, contact_name, email, phone, rcic_number, firm_size, current_software, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const items = (data ?? []) as AccessRequest[];
  const pending = items.filter(
    (i) => i.status === "new" || i.status === "contacted",
  ).length;

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">Access requests</h1>
        <p className="mt-1 text-sm text-stone-600">
          Firms asking to join the alpha program through the public site.{" "}
          {pending} awaiting action.
        </p>
      </header>

      <AccessRequestsTable items={items} />
    </div>
  );
}
