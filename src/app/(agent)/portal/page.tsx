import { format } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

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
import { getAgent } from "@/lib/auth/agent";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const agent = await getAgent();
  if (!agent) redirect("/login?error=unauthorized");

  const supabase = await createClient();

  // RLS (clients_agent_select) scopes this to the agent's own clients; no
  // explicit created_by_agent filter is needed, but we add it as belt-and-
  // suspenders so the intent is obvious.
  const { data: clients } = await supabase
    .schema("crm")
    .from("clients")
    .select("id, client_number, legal_name_full, email, phone_primary, status, created_at")
    .eq("created_by_agent", agent.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const rows = clients ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            My clients
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {rows.length === 0
              ? "You haven't registered any clients yet."
              : `${rows.length} client${rows.length === 1 ? "" : "s"} you've referred.`}
          </p>
        </div>
        <Link href="/portal/clients/new" className={buttonVariants()}>
          + Register client
        </Link>
      </div>

      <Card>
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
                  Contact
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Registered
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-sm text-stone-500"
                  >
                    No clients yet. Use “Register client” to add your first
                    referral.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-stone-500">
                      {c.client_number}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.legal_name_full}
                    </TableCell>
                    <TableCell className="text-xs text-stone-600">
                      {c.email ?? c.phone_primary ?? "—"}
                    </TableCell>
                    <TableCell className="capitalize text-stone-700">
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
    </main>
  );
}
