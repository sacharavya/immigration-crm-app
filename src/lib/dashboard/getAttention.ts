import type { SupabaseClient } from "@supabase/supabase-js";

import { staffCan, type StaffWithOverrides } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/types";

/**
 * What is waiting on this person right now — the first thing the dashboard
 * shows after sign-in. Each line is a count against a queue the person is
 * allowed to work, with the link that opens that queue. Zero counts are
 * dropped, so the list is only ever things that need doing.
 */
export type AttentionItem = {
  key: string;
  count: number;
  /** Singular / plural label, e.g. "document waiting for review". */
  noun: [string, string];
  href: string;
  tone: "critical" | "action" | "info";
};

const FIRM_TZ = "America/Toronto";

function torontoDayBounds(): { start: string; end: string; today: string } {
  const now = new Date();
  const ymd = now.toLocaleDateString("en-CA", { timeZone: FIRM_TZ }); // YYYY-MM-DD
  // Offset of the firm's clock right now, so the day's bounds are its midnight.
  const local = new Date(now.toLocaleString("en-US", { timeZone: FIRM_TZ }));
  const offsetMs = now.getTime() - local.getTime();
  const start = new Date(new Date(`${ymd}T00:00:00`).getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), today: ymd };
}

export async function getAttention(
  supabase: SupabaseClient<Database>,
  me: StaffWithOverrides,
): Promise<AttentionItem[]> {
  const { start, end, today } = torontoDayBounds();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const jobs: Array<Promise<AttentionItem | null>> = [];
  const push = (allowed: boolean, item: Omit<AttentionItem, "count">, q: () => PromiseLike<{ count: number | null }>) => {
    if (!allowed) return;
    jobs.push(count(q()).then((n) => (n > 0 ? { ...item, count: n } : null)));
  };

  push(
    staffCan(me, "view_tasks"),
    { key: "overdue_tasks", noun: ["overdue task", "overdue tasks"], href: "/dashboard/tasks?due=overdue", tone: "critical" },
    () =>
      supabase.schema("crm").from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_to", me.id).in("status", ["open", "in_progress", "blocked"]).is("deleted_at", null).lt("due_date", today),
  );
  push(
    staffCan(me, "review_documents"),
    { key: "documents", noun: ["document waiting for your review", "documents waiting for your review"], href: "/dashboard/cases?attention=documents", tone: "action" },
    () => supabase.schema("files").from("documents").select("id", { count: "exact", head: true }).eq("status", "uploaded").is("deleted_at", null),
  );
  push(
    staffCan(me, "review_payments"),
    { key: "payments", noun: ["payment proof to verify", "payment proofs to verify"], href: "/dashboard/payments?filter=unverified", tone: "action" },
    () => supabase.schema("crm").from("payments").select("id", { count: "exact", head: true }).not("client_uploaded_at", "is", null).is("verified_at", null),
  );
  push(
    staffCan(me, "manage_retainers"),
    { key: "retainers", noun: ["retainer awaiting signature", "retainers awaiting signature"], href: "/dashboard/cases?attention=retainer", tone: "info" },
    () => supabase.schema("crm").from("retainer_agreements").select("id", { count: "exact", head: true }).eq("status", "pending_signature").is("deleted_at", null),
  );
  push(
    staffCan(me, "create_cases"),
    { key: "requests", noun: ["case request to triage", "case requests to triage"], href: "/dashboard/requests", tone: "action" },
    () => supabase.schema("crm").from("case_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  );
  push(
    staffCan(me, "manage_appointments"),
    { key: "appointments_today", noun: ["appointment today", "appointments today"], href: "/dashboard/appointments", tone: "info" },
    () =>
      supabase.schema("crm").from("appointments").select("id", { count: "exact", head: true })
        .in("status", ["confirmed", "rescheduled"]).gte("starts_at", start).lt("starts_at", end).is("deleted_at", null),
  );
  push(
    staffCan(me, "manage_appointments"),
    { key: "appointments_review", noun: ["booking with a payment to check", "bookings with payments to check"], href: "/dashboard/appointments?status=awaiting_review", tone: "action" },
    () => supabase.schema("crm").from("appointments").select("id", { count: "exact", head: true }).eq("status", "awaiting_review").is("deleted_at", null),
  );

  return sortAttention((await Promise.all(jobs)).filter((i): i is AttentionItem => i !== null));
}

/** Biggest fires first: by tone, then by how many are waiting. */
export function sortAttention(items: AttentionItem[]): AttentionItem[] {
  const order = { critical: 0, action: 1, info: 2 };
  return [...items].sort((a, b) => order[a.tone] - order[b.tone] || b.count - a.count);
}
