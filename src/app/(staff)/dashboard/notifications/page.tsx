import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getStaff } from "@/lib/auth/staff";

import { notificationHref } from "../_actions/notification-href";
import { getAllNotifications } from "../_actions/notifications";
import { MarkAllReadButton } from "./_components/mark-all-read-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const me = await getStaff();
  if (!me) redirect("/login");

  const notifications = await getAllNotifications();
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Notifications</h1>
          <p className="text-sm text-stone-500">
            Activity on cases, appointments, and leads you&apos;re involved in.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center text-sm text-stone-500">
          You&apos;re all caught up.
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {notifications.map((n) => {
            const href = notificationHref(n);
            const body = (
              <div
                className={`flex flex-col gap-0.5 px-4 py-3 ${
                  !n.read_at ? "bg-[var(--primary)]/5" : ""
                } ${href ? "transition-colors hover:bg-stone-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {!n.read_at && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                  )}
                  <span className="text-sm font-medium text-stone-900">
                    {n.title}
                  </span>
                  <span className="ml-auto text-[11px] text-stone-400">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                {n.body && (
                  <span className="text-sm text-stone-500">{n.body}</span>
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {href ? <Link href={href}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
