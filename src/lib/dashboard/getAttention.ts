import type { SupabaseClient } from "@supabase/supabase-js";

import { staffCan, type StaffWithOverrides } from "@/lib/auth/permissions";
import type { Database } from "@/lib/supabase/types";

/**
 * What is waiting on this person right now — the first thing the dashboard
 * shows after sign-in. Each queue is a count plus the few items that have
 * waited longest, each linking straight to the record, so the card reads as
 * "these documents, these payments, these people" rather than as numbers.
 * Empty queues are dropped: the list is only ever things that need doing.
 */
export type AttentionEntry = { title: string; meta: string; href: string };

export type AttentionQueue = {
  key: string;
  count: number;
  /** Singular / plural label, e.g. "document waiting for your review". */
  noun: [string, string];
  href: string;
  tone: "critical" | "action" | "info";
  items: AttentionEntry[];
};

const FIRM_TZ = "America/Toronto";
const SHOWN = 3;

function torontoDayBounds(): { start: string; end: string; today: string } {
  const now = new Date();
  const ymd = now.toLocaleDateString("en-CA", { timeZone: FIRM_TZ });
  const local = new Date(now.toLocaleString("en-US", { timeZone: FIRM_TZ }));
  const offsetMs = now.getTime() - local.getTime();
  const start = new Date(new Date(`${ymd}T00:00:00`).getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), today: ymd };
}

/** "today", "yesterday", "3 days ago" — how long something has waited. */
export function ago(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { timeZone: FIRM_TZ, hour: "numeric", minute: "2-digit" });
}

type Named = { legal_name_full: string | null } | null;
const nameOf = (c: Named) => c?.legal_name_full?.trim() || "Unnamed client";

export async function getAttention(
  supabase: SupabaseClient<Database>,
  me: StaffWithOverrides,
): Promise<AttentionQueue[]> {
  const { start, end, today } = torontoDayBounds();
  const now = new Date();
  const jobs: Array<Promise<AttentionQueue | null>> = [];

  const queue = (
    allowed: boolean,
    shape: Omit<AttentionQueue, "count" | "items">,
    run: () => Promise<{ count: number | null; items: AttentionEntry[] }>,
  ) => {
    if (!allowed) return;
    jobs.push(
      run().then(({ count, items }) => ((count ?? 0) > 0 ? { ...shape, count: count ?? 0, items } : null)),
    );
  };

  queue(
    staffCan(me, "view_tasks"),
    { key: "overdue_tasks", noun: ["overdue task", "overdue tasks"], href: "/dashboard/tasks?due=overdue", tone: "critical" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("tasks")
        .select("id, title, due_date, case_id, case:cases(case_number, client:clients(legal_name_full))", { count: "exact" })
        .eq("assigned_to", me.id).in("status", ["open", "in_progress", "blocked"]).is("deleted_at", null).lt("due_date", today)
        .order("due_date", { ascending: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((t) => {
          const overdue = Math.floor((now.getTime() - new Date(`${t.due_date}T00:00:00`).getTime()) / 86_400_000);
          return {
            title: t.title,
            meta: [`${overdue} ${overdue === 1 ? "day" : "days"} overdue`, t.case?.case_number, t.case ? nameOf(t.case.client) : null].filter(Boolean).join(" · "),
            href: t.case_id ? `/dashboard/cases/${t.case_id}` : "/dashboard/tasks",
          };
        }),
      };
    },
  );

  queue(
    staffCan(me, "review_documents"),
    { key: "documents", noun: ["document waiting for your review", "documents waiting for your review"], href: "/dashboard/cases?attention=documents", tone: "action" },
    async () => {
      // files → crm is a cross-schema join PostgREST cannot embed, so the
      // case names come from a second read keyed by the few case ids shown.
      const { data, count } = await supabase
        .schema("files").from("documents")
        .select("id, display_name, created_at, case_id", { count: "exact" })
        .eq("status", "uploaded").is("deleted_at", null)
        .order("created_at", { ascending: true }).limit(SHOWN);
      const caseIds = [...new Set((data ?? []).map((d) => d.case_id).filter((id): id is string => !!id))];
      const { data: caseRows } = caseIds.length
        ? await supabase.schema("crm").from("cases").select("id, case_number, client:clients(legal_name_full)").in("id", caseIds)
        : { data: [] as Array<{ id: string; case_number: string; client: Named }> };
      const caseById = new Map((caseRows ?? []).map((c) => [c.id, c]));
      return {
        count,
        items: (data ?? []).map((d) => {
          const c = d.case_id ? caseById.get(d.case_id) : undefined;
          return {
            title: `${d.display_name} — ${nameOf(c?.client ?? null)}`,
            meta: [c?.case_number, `uploaded ${ago(d.created_at, now)}`].filter(Boolean).join(" · "),
            href: d.case_id ? `/dashboard/cases/${d.case_id}` : "/dashboard/cases",
          };
        }),
      };
    },
  );

  queue(
    staffCan(me, "review_payments"),
    { key: "payments", noun: ["payment proof to verify", "payment proofs to verify"], href: "/dashboard/payments?filter=unverified", tone: "action" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("payments")
        .select("id, amount_cad, client_uploaded_at, case_id, client:clients(legal_name_full), case:cases(case_number)", { count: "exact" })
        .not("client_uploaded_at", "is", null).is("verified_at", null)
        .order("client_uploaded_at", { ascending: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((p) => ({
          title: `$${Number(p.amount_cad).toLocaleString("en-CA")} from ${nameOf(p.client)}`,
          meta: [p.case?.case_number ?? "Consultation", `proof uploaded ${ago(p.client_uploaded_at, now)}`].join(" · "),
          href: p.case_id ? `/dashboard/cases/${p.case_id}` : "/dashboard/payments",
        })),
      };
    },
  );

  queue(
    staffCan(me, "manage_retainers"),
    { key: "retainers", noun: ["retainer awaiting the client's signature", "retainers awaiting the client's signature"], href: "/dashboard/cases?attention=retainer", tone: "info" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("retainer_agreements")
        .select("id, sent_at, created_at, case_id, case:cases(case_number, client:clients(legal_name_full))", { count: "exact" })
        .eq("status", "pending_signature").is("deleted_at", null)
        .order("sent_at", { ascending: true, nullsFirst: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((r) => ({
          title: nameOf(r.case?.client ?? null),
          meta: [r.case?.case_number, r.sent_at ? `sent ${ago(r.sent_at, now)}` : "not sent yet"].filter(Boolean).join(" · "),
          href: `/dashboard/cases/${r.case_id}`,
        })),
      };
    },
  );

  queue(
    staffCan(me, "create_cases"),
    { key: "requests", noun: ["case request to triage", "case requests to triage"], href: "/dashboard/requests", tone: "action" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("case_requests")
        .select("id, created_at, note, client:clients(legal_name_full)", { count: "exact" })
        .eq("status", "pending").order("created_at", { ascending: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((r) => ({
          title: nameOf(r.client),
          meta: [`requested ${ago(r.created_at, now)}`, r.note?.trim() ? r.note.trim().slice(0, 60) : null].filter(Boolean).join(" · "),
          href: "/dashboard/requests",
        })),
      };
    },
  );

  queue(
    staffCan(me, "manage_appointments"),
    { key: "appointments_today", noun: ["appointment today", "appointments today"], href: "/dashboard/appointments", tone: "info" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("appointments")
        .select("id, starts_at, snapshot_client_name, location_type", { count: "exact" })
        .in("status", ["confirmed", "rescheduled"]).gte("starts_at", start).lt("starts_at", end).is("deleted_at", null)
        .order("starts_at", { ascending: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((a) => ({
          title: a.snapshot_client_name,
          meta: `${clock(a.starts_at)} · ${String(a.location_type).replace(/_/g, " ")}`,
          href: "/dashboard/appointments",
        })),
      };
    },
  );

  queue(
    staffCan(me, "manage_appointments"),
    { key: "appointments_review", noun: ["booking with a payment to check", "bookings with payments to check"], href: "/dashboard/appointments?status=awaiting_review", tone: "action" },
    async () => {
      const { data, count } = await supabase
        .schema("crm").from("appointments")
        .select("id, starts_at, snapshot_client_name", { count: "exact" })
        .eq("status", "awaiting_review").is("deleted_at", null)
        .order("starts_at", { ascending: true }).limit(SHOWN);
      return {
        count,
        items: (data ?? []).map((a) => ({
          title: a.snapshot_client_name,
          meta: `booked for ${new Date(a.starts_at).toLocaleDateString("en-CA", { timeZone: FIRM_TZ, month: "short", day: "numeric" })} at ${clock(a.starts_at)}`,
          href: "/dashboard/appointments?status=awaiting_review",
        })),
      };
    },
  );

  return sortAttention((await Promise.all(jobs)).filter((q): q is AttentionQueue => q !== null));
}

/** Biggest fires first: by tone, then by how many are waiting. */
export function sortAttention(queues: AttentionQueue[]): AttentionQueue[] {
  const order = { critical: 0, action: 1, info: 2 };
  return [...queues].sort((a, b) => order[a.tone] - order[b.tone] || b.count - a.count);
}
