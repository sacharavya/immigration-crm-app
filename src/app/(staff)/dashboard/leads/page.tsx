import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// People who filled a public form (NOC finder etc.) or were entered manually
// but have no case yet. Converting = creating a case; the case action flips
// status to 'active', which moves them to the Clients worklist.

type NocInquiry = {
  intent?: string;
  noc_code?: string;
  noc_title?: string;
  teer?: number;
  sowp_status?: string;
  note?: string | null;
  submitted_at?: string;
};

const INTENT_LABELS: Record<string, string> = {
  sowp: "Spousal open work permit",
  express_entry: "Express Entry",
  not_sure: "Wants advice",
};

const SOURCE_LABELS: Record<string, string> = {
  noc_finder: "NOC finder",
  website_contact: "Website contact",
  booking: "Booking",
  manual: "Manual entry",
};

export default async function LeadsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_clients")) redirect("/dashboard");
  const canConvert = staffCan(me, "create_cases");

  const supabase = await createClient();
  const { data: leads } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      "id, client_number, legal_name_full, email, phone_primary, source, background_responses, created_at",
    )
    .eq("status", "lead")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  // BBI-CRM alpha requests from /immigration-crm-software. Newer than the
  // generated Database types, hence the untyped view.
  const { data: accessRequests } = await (
    supabase as unknown as SupabaseClient
  )
    .schema("crm")
    .from("software_access_requests")
    .select(
      "id, firm_name, contact_name, email, phone, rcic_number, firm_size, current_software, message, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const requests = (accessRequests ?? []) as Array<{
    id: string;
    firm_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    rcic_number: string | null;
    firm_size: string | null;
    current_software: string | null;
    message: string | null;
    status: string;
    created_at: string;
  }>;

  const rows = (leads ?? []).map((l) => {
    const responses = l.background_responses as Record<string, unknown> | null;
    const noc = (responses?.noc_inquiry as NocInquiry | undefined) ?? null;
    const web = responses?.website_inquiry as
      | { service?: string; message?: string | null }
      | undefined;
    // Website inquiries reuse the same display slots: service as intent,
    // message as note.
    const inquiry =
      noc ??
      (web ? { intent: web.service, note: web.message ?? null } : null);
    return { ...l, inquiry };
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Leads</h1>
          <p className="mt-1 text-sm text-stone-500">
            Form submissions and prospects without a case yet. Converting a
            lead creates a case and moves them to Clients.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-stone-400">
          <Inbox className="h-8 w-8" />
          <p className="text-sm">No open leads.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Interested in</th>
                <th className="px-4 py-3 font-medium">NOC</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr
                  key={l.id}
                  className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/leads/${l.id}`}
                      className="font-medium text-stone-900 hover:text-[var(--primary)] hover:underline"
                    >
                      {l.legal_name_full}
                    </Link>
                    <div className="text-xs text-stone-400">
                      {l.client_number}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    <div>{l.email ?? "-"}</div>
                    <div className="text-xs text-stone-400">
                      {l.phone_primary ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {SOURCE_LABELS[l.source ?? ""] ?? l.source ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {l.inquiry?.intent
                      ? (INTENT_LABELS[l.inquiry.intent] ?? l.inquiry.intent)
                      : "-"}
                    {l.inquiry?.note ? (
                      <div
                        className="max-w-56 truncate text-xs text-stone-400"
                        title={l.inquiry.note}
                      >
                        {l.inquiry.note}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {l.inquiry?.noc_code ? (
                      <span title={l.inquiry.noc_title}>
                        {l.inquiry.noc_code}
                        {typeof l.inquiry.teer === "number"
                          ? ` (TEER ${l.inquiry.teer})`
                          : ""}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(l.created_at as string).toLocaleDateString(
                      "en-CA",
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canConvert && (
                      <Link
                        href={`/dashboard/cases/new?client_id=${l.id}`}
                        className="inline-flex items-center gap-1.5 bg-[var(--navy)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--navy)]/90"
                      >
                        Convert to client
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-stone-900">
            BBI-CRM access requests
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Firms asking to join the alpha program via the public
            /immigration-crm-software page.
          </p>
          <div className="mt-4 overflow-x-auto border border-stone-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                  <th className="px-4 py-3 font-medium">Firm</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 font-medium">Current software</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-stone-900">
                        {r.firm_name}
                      </div>
                      {r.rcic_number && (
                        <div className="text-xs text-stone-400">
                          RCIC# {r.rcic_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      <div>{r.contact_name}</div>
                      <div className="text-xs text-stone-400">
                        {r.email}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.firm_size ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.current_software ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {r.message ? (
                        <span
                          className="block max-w-64 truncate"
                          title={r.message}
                        >
                          {r.message}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
