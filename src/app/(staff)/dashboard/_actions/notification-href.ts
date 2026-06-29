import type { NotificationRow } from "./notifications";

// The deep-link target for a notification: the generic `link` set by the
// trigger, falling back to the case for older rows that only have case_id.
//
// Lives outside notifications.ts because that file is "use server" and may only
// export async functions; this is a plain sync helper used by client + server.
export function notificationHref(n: NotificationRow): string | null {
  if (n.link) return n.link;
  if (n.case_id) return `/dashboard/cases/${n.case_id}`;
  return null;
}
