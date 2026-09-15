import { createClient } from "@/lib/supabase/server";

import { FeedbackInbox } from "../_components/feedback-inbox";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const supabase = await createClient();

  // Tickets carry the firm's own words, which is the one thing firms
  // deliberately send to the operator. Everything else about them stays
  // unreachable from this portal.
  const { data: rows } = await supabase
    .schema("platform")
    .from("feedback")
    .select(
      "id, tenant_id, kind, subject, body, status, admin_response, responded_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: tenants } = await supabase
    .schema("crm")
    .from("tenants")
    .select("id, name");

  const names = new Map((tenants ?? []).map((t) => [t.id, t.name]));

  const items = (rows ?? []).map((r) => ({
    ...r,
    tenant_name: names.get(r.tenant_id) ?? "Unknown firm",
  }));

  const open = items.filter(
    (i) => i.status === "open" || i.status === "in_progress",
  ).length;

  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-xl font-semibold text-stone-900">Support inbox</h1>
        <p className="mt-1 text-sm text-stone-600">
          Complaints, bugs and requests raised by firms. {open} open.
        </p>
      </header>

      <FeedbackInbox items={items} />
    </div>
  );
}
