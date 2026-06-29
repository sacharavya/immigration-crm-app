"use server";

import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

// In-app notifications. Auth-only — there is no per-permission gate: RLS
// (notifications_select_own / _update_own) already scopes every row to the
// caller's own staff id, so the cookie-scoped client is the security boundary.
// Rows are created by the DB trigger (see 20260628000001_notifications.sql),
// never here.

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  case_id: string | null;
  read_at: string | null;
  created_at: string;
};

// Lightweight count the bell polls. Uses head+exact so no rows travel.
export async function getUnreadCount(): Promise<number> {
  const me = await getStaff();
  if (!me) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .schema("crm")
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

// Newest notifications for the dropdown (read + unread).
export async function getRecentNotifications(): Promise<NotificationRow[]> {
  const me = await getStaff();
  if (!me) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("crm")
    .from("notifications")
    .select("id, type, title, body, case_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];
  return (data ?? []) as NotificationRow[];
}

type MutateResult = { ok: true } | { error: string };

export async function markRead(id: string): Promise<MutateResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function markAllRead(): Promise<MutateResult> {
  const me = await getStaff();
  if (!me) return { error: "Not authenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .schema("crm")
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) return { error: error.message };
  return { ok: true };
}
