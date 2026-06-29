import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { AgentType } from "@/lib/validators/agent";

import { RequestCard, type RequestCardData } from "./_components/request-card";
import {
  RequestStatusTabs,
  type RequestStatus,
} from "./_components/status-tabs";

export const dynamic = "force-dynamic";

const VALID_STATUSES: ReadonlyArray<RequestStatus> = [
  "pending",
  "opened",
  "dismissed",
];

const EMPTY_COPY: Record<RequestStatus, string> = {
  pending: "No pending case requests. New referrals from agents land here.",
  opened: "No requests have been opened into cases yet.",
  dismissed: "No dismissed requests.",
};

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function CaseRequestsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_cases")) {
    redirect("/dashboard?error=forbidden");
  }

  const sp = await searchParams;
  const status: RequestStatus = (VALID_STATUSES as readonly string[]).includes(
    sp.status ?? "",
  )
    ? (sp.status as RequestStatus)
    : "pending";

  const canCreate = staffCan(me, "create_cases");
  const supabase = await createClient();

  const countFor = (s: RequestStatus) =>
    supabase
      .schema("crm")
      .from("case_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", s);

  // The selected status's rows plus the three tab counts, all in one wave.
  // Pending is shown oldest-first (FIFO triage); handled lists show newest-first.
  const [requestsRes, pendingCount, openedCount, dismissedCount] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("case_requests")
        .select(
          "id, client_id, service_type_id, agent_id, note, status, resulting_case_id, handled_by, handled_at, created_at",
        )
        .eq("status", status)
        .order("created_at", { ascending: status === "pending" })
        .limit(200),
      countFor("pending"),
      countFor("opened"),
      countFor("dismissed"),
    ]);

  const rows = requestsRes.data ?? [];

  // Cross-schema lookups resolved in JS, in one parallel wave keyed off the rows.
  const clientIds = [...new Set(rows.map((r) => r.client_id))];
  const agentIds = [...new Set(rows.map((r) => r.agent_id))];
  const serviceIds = [
    ...new Set(
      rows.map((r) => r.service_type_id).filter((v): v is string => !!v),
    ),
  ];
  const handlerIds = [
    ...new Set(rows.map((r) => r.handled_by).filter((v): v is string => !!v)),
  ];
  const caseIds = [
    ...new Set(
      rows.map((r) => r.resulting_case_id).filter((v): v is string => !!v),
    ),
  ];

  const [
    { data: clients },
    { data: agents },
    { data: services },
    { data: handlers },
    { data: cases },
  ] = await Promise.all([
    clientIds.length
      ? supabase
          .schema("crm")
          .from("clients")
          .select("id, client_number, legal_name_full, email, phone_primary")
          .in("id", clientIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    agentIds.length
      ? supabase
          .schema("crm")
          .from("referral_agents")
          .select("id, name, organization, agent_type, email")
          .in("id", agentIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    serviceIds.length
      ? supabase
          .schema("ref")
          .from("service_types")
          .select("id, name")
          .in("id", serviceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    handlerIds.length
      ? supabase
          .schema("crm")
          .from("staff")
          .select("id, first_name, last_name")
          .in("id", handlerIds)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    caseIds.length
      ? supabase
          .schema("crm")
          .from("cases")
          .select("id, case_number")
          .in("id", caseIds)
      : Promise.resolve({
          data: [] as Array<{ id: string; case_number: string }>,
        }),
  ]);

  const clientById = new Map((clients ?? []).map((c) => [c.id as string, c]));
  const agentById = new Map((agents ?? []).map((a) => [a.id as string, a]));
  const serviceById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const handlerById = new Map(
    (handlers ?? []).map((s) => [
      s.id as string,
      `${s.first_name as string} ${s.last_name as string}`.trim(),
    ]),
  );
  const caseById = new Map((cases ?? []).map((c) => [c.id, c.case_number]));

  const counts: Record<RequestStatus, number> = {
    pending: pendingCount.count ?? 0,
    opened: openedCount.count ?? 0,
    dismissed: dismissedCount.count ?? 0,
  };

  const requests: RequestCardData[] = rows.map((r) => {
    const client = clientById.get(r.client_id);
    const agent = agentById.get(r.agent_id);
    const caseNumber = r.resulting_case_id
      ? (caseById.get(r.resulting_case_id) ?? null)
      : null;
    return {
      id: r.id,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
      handledAt: r.handled_at,
      clientId: r.client_id,
      client: client
        ? {
            name: (client.legal_name_full as string) ?? "Unknown client",
            number: client.client_number as string,
            email: (client.email as string | null) ?? null,
            phone: (client.phone_primary as string | null) ?? null,
          }
        : null,
      agent: agent
        ? {
            name: agent.name as string,
            organization: (agent.organization as string | null) ?? null,
            type: agent.agent_type as AgentType,
            email: (agent.email as string | null) ?? null,
          }
        : null,
      serviceName: r.service_type_id
        ? (serviceById.get(r.service_type_id) ?? null)
        : null,
      resultingCase:
        r.resulting_case_id && caseNumber
          ? { id: r.resulting_case_id, number: caseNumber }
          : null,
      handledByName: r.handled_by
        ? (handlerById.get(r.handled_by) ?? null)
        : null,
    };
  });

  return (
    <main className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Case requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agents asking the firm to open a case for a client they referred.
        </p>
      </div>

      <RequestStatusTabs active={status} counts={counts} />

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          {EMPTY_COPY[status]}
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard key={r.id} request={r} canCreate={canCreate} />
          ))}
        </div>
      )}
    </main>
  );
}
