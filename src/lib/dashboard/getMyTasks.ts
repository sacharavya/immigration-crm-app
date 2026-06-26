// Tasks assigned to the current user. The one role-scoped panel on the page.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { DashboardTask } from "./types";

const ACTIVE_TASK_STATUSES = ["open", "in_progress", "blocked"] as const;

export async function getMyTasks(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DashboardTask[]> {
  const { data } = await supabase
    .schema("crm")
    .from("tasks")
    .select(
      "id, title, status, priority, due_at, due_date, case_id, case:cases(case_number)",
    )
    .eq("assigned_to", userId)
    .in("status", ACTIVE_TASK_STATUSES)
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(10);

  return (data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    caseId: t.case_id,
    caseNumber: t.case?.case_number ?? null,
    dueAt: t.due_at,
    dueDate: t.due_date,
    status: t.status,
    priority: t.priority,
  }));
}
