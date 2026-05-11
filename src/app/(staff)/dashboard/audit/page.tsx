import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { AuditFilters } from "./_components/audit-filters";
import { AuditRow, type AuditRowData } from "./_components/audit-row";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    schema?: string;
    table?: string;
    op?: string;
    actor?: string;
    q?: string;
  }>;
};

const ROW_LIMIT = 200;

function isIsoDate(v: string | undefined): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export default async function AuditPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_audit_log")) {
    redirect("/dashboard?error=forbidden_view_audit_log");
  }

  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from! : null;
  const to = isIsoDate(sp.to) ? sp.to! : null;
  const schema = sp.schema?.trim() || null;
  const table = sp.table?.trim() || null;
  const op = sp.op === "I" || sp.op === "U" || sp.op === "D" ? sp.op : null;
  const actorId =
    sp.actor && /^[0-9a-f-]{36}$/i.test(sp.actor) ? sp.actor : null;
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();

  // Query change_log with filters. The DB has indexes on
  // (schema_name, table_name, row_id), actor_user_id, and occurred_at
  // DESC — combined with the LIMIT keeps this snappy at firm scale.
  let query = supabase
    .schema("audit")
    .from("change_log")
    .select(
      "id, occurred_at, actor_user_id, actor_staff_id, schema_name, table_name, operation, row_id, changed_columns, old_values, new_values",
    )
    .order("occurred_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", `${to}T23:59:59.999Z`);
  if (schema) query = query.eq("schema_name", schema);
  if (table) query = query.eq("table_name", table);
  if (op) query = query.eq("operation", op);
  if (actorId) query = query.eq("actor_staff_id", actorId);
  if (q && /^[0-9a-f-]{36}$/i.test(q)) {
    // Exact UUID — match on row_id directly.
    query = query.eq("row_id", q);
  }

  const { data: rows } = await query;
  const safeRows = rows ?? [];

  // In-memory filter for free-text "search" against row_id prefix or
  // changed-column names, since PostgREST doesn't compose well across
  // those two predicates. With LIMIT 200 this is cheap.
  const filtered = q && !/^[0-9a-f-]{36}$/i.test(q)
    ? safeRows.filter((r) => {
        const lower = q.toLowerCase();
        if (r.row_id?.toLowerCase().includes(lower)) return true;
        if (r.changed_columns?.some((c) => c.toLowerCase().includes(lower))) {
          return true;
        }
        return false;
      })
    : safeRows;

  // Resolve actor staff names in a follow-up query.
  const actorIds = [
    ...new Set(
      filtered
        .map((r) => r.actor_staff_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: staff } = actorIds.length
    ? await supabase
        .schema("crm")
        .from("staff")
        .select("id, first_name, last_name")
        .in("id", actorIds)
    : { data: [] };
  const actorById = new Map(
    (staff ?? []).map((s) => [
      s.id,
      `${s.first_name} ${s.last_name}`.trim(),
    ]),
  );

  // Filter dropdowns: distinct schema/table values from the current
  // result set (not the whole table — keeps it bounded). Plus a staff
  // dropdown of all active staff for the Actor filter.
  const schemaOptions = Array.from(
    new Set(safeRows.map((r) => r.schema_name)),
  ).sort();
  const tableOptions = Array.from(
    new Set(safeRows.map((r) => r.table_name)),
  ).sort();

  const { data: allStaff } = await supabase
    .schema("crm")
    .from("staff")
    .select("id, first_name, last_name")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("last_name", { ascending: true });
  const staffOptions = (allStaff ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`.trim(),
  }));

  const projected: AuditRowData[] = filtered.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    actorName: r.actor_staff_id
      ? actorById.get(r.actor_staff_id) ?? null
      : null,
    schemaName: r.schema_name,
    tableName: r.table_name,
    operation: r.operation as "I" | "U" | "D",
    rowId: r.row_id,
    changedColumns: r.changed_columns,
    oldValues: r.old_values as Record<string, unknown> | null,
    newValues: r.new_values as Record<string, unknown> | null,
  }));

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Every insert, update, and delete across the system. Click a
          row to expand the diff. Showing the most recent
          {" "}{projected.length} of {ROW_LIMIT} max.
        </p>
      </div>

      <AuditFilters
        from={from}
        to={to}
        schema={schema}
        table={table}
        op={op}
        actorId={actorId}
        q={q}
        schemaOptions={schemaOptions}
        tableOptions={tableOptions}
        staffOptions={staffOptions}
      />

      {projected.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-stone-500">
            No audit entries match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <ul className="divide-y divide-stone-100">
            {projected.map((row) => (
              <AuditRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
