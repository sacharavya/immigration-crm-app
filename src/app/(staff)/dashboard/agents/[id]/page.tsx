import { format } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { AGENT_TYPE_LABEL, type AgentType } from "@/lib/validators/agent";

import { EditAgentDialog } from "../_components/edit-agent-dialog";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_agents")) redirect("/dashboard");

  const supabase = await createClient();

  const { data: agent } = await supabase
    .schema("crm")
    .from("referral_agents")
    .select(
      "id, name, organization, agent_type, email, phone, website, country_code, commission_terms, notes, is_active, deleted_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!agent) notFound();

  const [{ data: clients }, { data: countries }] = await Promise.all([
    supabase
      .schema("crm")
      .from("clients")
      .select("id, client_number, legal_name_full, email, status, created_at")
      .eq("created_by_agent", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.schema("ref").from("countries").select("code, name").order("name"),
  ]);

  const deactivated = agent.deleted_at !== null;
  const clientList = clients ?? [];

  return (
    <main className="space-y-6 px-6 py-8">
      <div>
        <Link
          href="/dashboard/agents"
          className="text-sm text-stone-500 hover:text-[var(--primary)] hover:underline"
        >
          ← Referral Partners
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
              {agent.name}
            </h1>
            <Badge className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
              {AGENT_TYPE_LABEL[agent.agent_type as AgentType]}
            </Badge>
            {deactivated ? (
              <span className="text-xs font-medium text-stone-500">
                Deactivated
              </span>
            ) : (
              <span className="text-xs font-medium text-green-700">Active</span>
            )}
          </div>
          {agent.organization && (
            <p className="mt-1 text-sm text-stone-500">{agent.organization}</p>
          )}
        </div>
        <CanServer staff={me} permission="manage_agents">
          <EditAgentDialog
            countries={countries ?? []}
            agent={{
              id: agent.id,
              name: agent.name,
              organization: agent.organization,
              agent_type: agent.agent_type as AgentType,
              phone: agent.phone,
              website: agent.website,
              country_code: agent.country_code,
              commission_terms: agent.commission_terms,
              notes: agent.notes,
            }}
          />
        </CanServer>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Email" value={agent.email} />
            <DetailRow label="Phone" value={agent.phone} />
            <DetailRow
              label="Website"
              value={agent.website}
            />
            <DetailRow label="Country" value={agent.country_code} />
            <DetailRow
              label="Commission"
              value={agent.commission_terms}
            />
            <DetailRow
              label="Added"
              value={format(new Date(agent.created_at), "PP")}
            />
            {agent.notes && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Notes
                </div>
                <p className="mt-1 whitespace-pre-wrap text-stone-700">
                  {agent.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Referred clients ({clientList.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Client #
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Created
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-sm text-stone-500"
                    >
                      No clients referred yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientList.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-stone-500">
                        {c.client_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/clients/${c.id}`}
                          className="hover:text-[var(--primary)] hover:underline"
                        >
                          {c.legal_name_full}
                        </Link>
                        {c.email && (
                          <div className="text-xs text-stone-500">
                            {c.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-stone-700 capitalize">
                        {c.status}
                      </TableCell>
                      <TableCell className="text-right text-xs text-stone-500">
                        {format(new Date(c.created_at), "PP")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {clientList.length > 0 && (
        <div>
          <Link
            href="/dashboard/clients"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View all clients
          </Link>
        </div>
      )}
    </main>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </span>
      <span className="text-right text-stone-700">{value || "—"}</span>
    </div>
  );
}
