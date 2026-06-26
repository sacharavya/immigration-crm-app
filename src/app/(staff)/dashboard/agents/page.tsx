import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStaff } from "@/lib/auth/staff";
import { staffCan } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { AGENT_TYPE_LABEL, type AgentType } from "@/lib/validators/agent";

import { AddAgentDialog } from "./_components/add-agent-dialog";
import { AgentRowActions } from "./_components/agent-row-actions";

export default async function AgentsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_agents")) redirect("/dashboard");

  const supabase = await createClient();

  const [{ data: rows }, { data: clientRows }, { data: countries }] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("referral_agents")
        .select(
          "id, name, organization, email, agent_type, is_active, deleted_at, created_at",
        )
        .order("deleted_at", { ascending: true, nullsFirst: true })
        .order("name", { ascending: true }),
      supabase
        .schema("crm")
        .from("clients")
        .select("created_by_agent")
        .is("deleted_at", null)
        .not("created_by_agent", "is", null),
      supabase.schema("ref").from("countries").select("code, name").order("name"),
    ]);

  // Tally clients per agent in-memory — small datasets, avoids a SQL group-by
  // round-trip through PostgREST.
  const clientCounts = new Map<string, number>();
  for (const c of clientRows ?? []) {
    if (!c.created_by_agent) continue;
    clientCounts.set(
      c.created_by_agent,
      (clientCounts.get(c.created_by_agent) ?? 0) + 1,
    );
  }

  const canManage = staffCan(me, "manage_agents");
  const totalActive = (rows ?? []).filter((r) => r.deleted_at === null).length;

  return (
    <main className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Agents
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Referral partners who register and refer their own clients.
            {totalActive > 0
              ? ` ${totalActive} active.`
              : " None active yet."}
          </p>
        </div>
        <CanServer staff={me} permission="manage_agents">
          <AddAgentDialog countries={countries ?? []} />
        </CanServer>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Name
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Organization
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Type
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Clients
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Added
                </TableHead>
                {canManage && (
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 7 : 6}
                    className="text-center text-sm text-stone-500"
                  >
                    No agents yet.
                  </TableCell>
                </TableRow>
              ) : (
                (rows ?? []).map((r) => {
                  const deactivated = r.deleted_at !== null;
                  const count = clientCounts.get(r.id) ?? 0;
                  return (
                    <TableRow
                      key={r.id}
                      className={deactivated ? "opacity-60" : ""}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/agents/${r.id}`}
                          className="hover:text-[var(--primary)] hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.email && (
                          <div className="text-xs text-stone-500">
                            {r.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-stone-700">
                        {r.organization ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700">
                          {AGENT_TYPE_LABEL[r.agent_type as AgentType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-stone-700">{count}</TableCell>
                      <TableCell>
                        {deactivated ? (
                          <span className="text-xs font-medium text-stone-500">
                            Deactivated
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-stone-500">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/dashboard/agents/${r.id}`}
                              className={buttonVariants({
                                size: "sm",
                                variant: "ghost",
                              })}
                            >
                              View
                            </Link>
                            <AgentRowActions
                              target={{
                                id: r.id,
                                name: r.name,
                                email: r.email,
                                deactivated,
                              }}
                            />
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
