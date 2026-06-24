import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { TasksFilters } from "./_components/tasks-filters";
import { TasksTable, type TaskRow } from "./_components/tasks-table";

const STATUS_OPTIONS = ["open", "in_progress", "blocked", "done", "cancelled"] as const;
type TaskStatus = (typeof STATUS_OPTIONS)[number];

type Props = {
  searchParams: Promise<{ status?: string; mine?: string }>;
};

export default async function TasksPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");

  if (!staffCan(me, "view_tasks")) {
    redirect("/dashboard?error=forbidden_view_tasks");
  }

  const sp = await searchParams;
  const status = (STATUS_OPTIONS as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TaskStatus)
    : null;
  const mineOnly = sp.mine === "1";

  const supabase = await createClient();

  let query = supabase
    .schema("crm")
    .from("tasks")
    .select(
      `
        id,
        title,
        status,
        priority,
        due_at,
        due_date,
        case_id,
        assigned_to,
        case:cases(case_number)
      `,
    )
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) {
    query = query.eq("status", status);
  } else {
    // Default view excludes completed/cancelled noise.
    query = query.in("status", ["open", "in_progress", "blocked"]);
  }

  if (mineOnly) {
    query = query.eq("assigned_to", me.id);
  }

  const { data: tasks } = await query;

  const assigneeIds = [
    ...new Set((tasks ?? []).map((t) => t.assigned_to).filter(Boolean)),
  ] as string[];

  const { data: staffRows } = assigneeIds.length
    ? await supabase
        .schema("crm")
        .from("staff")
        .select("id, first_name, last_name")
        .in("id", assigneeIds)
    : { data: [] as Array<{ id: string; first_name: string; last_name: string }> };

  const staffById = new Map(
    (staffRows ?? []).map((s) => [
      s.id,
      `${s.first_name} ${s.last_name}`.trim(),
    ]),
  );

  const rows: TaskRow[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueAt: t.due_at ?? (t.due_date ? `${t.due_date}T00:00:00Z` : null),
    caseId: t.case_id,
    caseNumber: t.case?.case_number ?? null,
    assigneeId: t.assigned_to,
    assigneeName: t.assigned_to ? (staffById.get(t.assigned_to) ?? null) : null,
  }));

  const total = rows.length;
  const isFiltered = status !== null || mineOnly;

  return (
    <main className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {total === 0
              ? isFiltered
                ? "No tasks match these filters."
                : "No active tasks."
              : `${total} ${isFiltered ? "matching" : "active"} task${total === 1 ? "" : "s"}.`}
          </p>
        </div>
      </div>

      <TasksFilters status={status} mine={mineOnly} />

      <TasksTable rows={rows} />
    </main>
  );
}
