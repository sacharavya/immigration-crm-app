import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { getAgent } from "@/lib/auth/agent";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type CaseStatus } from "@/lib/utils/phase";

import { RequestCaseForm } from "./_components/request-case-form";

export const dynamic = "force-dynamic";

function statusLabel(status: string | null): string {
  if (!status) return "Pending";
  return STATUS_LABEL[status as CaseStatus] ?? status;
}

export default async function AgentClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const agent = await getAgent();
  if (!agent) redirect("/login?error=unauthorized");

  const { id } = await params;
  const supabase = await createClient();

  // RLS (clients_agent_select) limits this to the agent's own clients, so an id
  // they did not add resolves to null.
  const { data: client } = await supabase
    .schema("crm")
    .from("clients")
    .select(
      "id, client_number, legal_name_full, email, phone_primary, country_of_citizenship, country_of_residence, notes, status, created_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: cases }, { data: requests }, { data: services }, { data: countries }] =
    await Promise.all([
      // Status only, via the agent-scoped view (no fees or notes exposed).
      supabase
        .schema("crm")
        .from("agent_case_status")
        .select("id, case_number, service_name, status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .schema("crm")
        .from("case_requests")
        .select("id, service_type_id, note, status, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .schema("ref")
        .from("service_types")
        .select("id, name")
        .is("deactivated_at", null)
        .order("display_order"),
      supabase.schema("ref").from("countries").select("code, name"),
    ]);

  const serviceById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const countryByCode = new Map((countries ?? []).map((c) => [c.code, c.name]));
  const countryName = (code: string | null) =>
    code ? (countryByCode.get(code) ?? code) : "Not provided";

  const caseRows = cases ?? [];
  const pendingRequests = (requests ?? []).filter((r) => r.status === "pending");

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-4 w-4" />
        My clients
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          {client.legal_name_full}
        </h1>
        <p className="mt-1 font-mono text-xs text-stone-500">
          {client.client_number}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-stone-700">Details</h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Detail label="Email" value={client.email ?? "Not provided"} />
                <Detail
                  label="Phone"
                  value={client.phone_primary ?? "Not provided"}
                />
                <Detail
                  label="Citizenship"
                  value={countryName(client.country_of_citizenship)}
                />
                <Detail
                  label="Residence"
                  value={countryName(client.country_of_residence)}
                />
                <Detail
                  label="Registered"
                  value={format(new Date(client.created_at), "PP")}
                />
                <Detail label="Status" value={client.status} />
              </dl>
              {client.notes && (
                <div className="mt-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
                    Notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
                    {client.notes}
                  </dd>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-stone-700">Cases</h2>
              {caseRows.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  No cases yet. Use Request case to ask the firm to open one.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-stone-100">
                  {caseRows.map((c) => (
                    <li
                      key={c.id ?? c.case_number}
                      className="flex items-center gap-4 py-2.5"
                    >
                      <span className="font-mono text-xs text-stone-400">
                        {c.case_number}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-stone-700">
                        {c.service_name ?? "Service not set"}
                      </span>
                      <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-600">
                        {statusLabel(c.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {pendingRequests.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
                  {pendingRequests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 text-sm text-stone-600"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {r.service_type_id
                          ? (serviceById.get(r.service_type_id) ?? "Case")
                          : "Case"}{" "}
                        requested
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                        Pending review
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <h2 className="text-sm font-semibold text-stone-700">
                  Request a case
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Ask the firm to open a case for this client. A team member sets
                  the consultant and fee.
                </p>
              </div>
              <RequestCaseForm
                clientId={client.id}
                services={(services ?? []).map((s) => ({
                  id: s.id,
                  name: s.name,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-stone-700">{value}</dd>
    </div>
  );
}
