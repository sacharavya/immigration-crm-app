"use client";

import { Menu } from "@base-ui/react/menu";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { cn } from "@/lib/utils/index";

import {
  getRecentNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  type NotificationRow,
} from "../dashboard/_actions/notifications";

// Poll the unread count on this cadence. Kept generous: notifications are not
// time-critical and a tighter loop just adds DB load.
const POLL_MS = 45_000;

export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const refreshCount = useCallback(async () => {
    setUnread(await getUnreadCount());
  }, []);

  // Realtime-later seam: this whole effect is the only thing that changes to go
  // live — swap the interval for a supabase.channel(...).on('postgres_changes',
  // { table: 'notifications', filter: `staff_id=eq.<id>` }).subscribe() using
  // the browser client in src/lib/supabase/client.ts.
  useEffect(() => {
    // Deferred so the initial fetch's setState doesn't run synchronously in the
    // effect body (it's a subscription, not derived state).
    queueMicrotask(() => void refreshCount());
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void getRecentNotifications().then(setItems);
  }

  function handleOpenItem(n: NotificationRow) {
    if (!n.read_at) {
      // Optimistic: clear locally, then persist + refresh the badge.
      setItems((prev) =>
        prev.map((p) =>
          p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p,
        ),
      );
      startTransition(async () => {
        await markRead(n.id);
        await refreshCount();
      });
    }
    if (n.case_id) router.push(`/dashboard/cases/${n.case_id}`);
  }

  function handleMarkAll() {
    setItems((prev) =>
      prev.map((p) => ({ ...p, read_at: p.read_at ?? new Date().toISOString() })),
    );
    startTransition(async () => {
      await markAllRead();
      await refreshCount();
    });
  }

  const hasUnreadInList = items.some((i) => !i.read_at);

  return (
    <Menu.Root open={open} onOpenChange={handleOpenChange}>
      <Menu.Trigger
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" side="top" className="z-50">
          <Menu.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover text-popover-foreground shadow-lg outline-none">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {hasUnreadInList && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto py-1">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-stone-500">
                  You&apos;re all caught up.
                </p>
              ) : (
                items.map((n) => (
                  <Menu.Item
                    key={n.id}
                    onClick={() => handleOpenItem(n)}
                    className={cn(
                      "flex cursor-pointer select-none flex-col gap-0.5 px-3 py-2 text-left outline-none data-[highlighted]:bg-muted",
                      !n.read_at && "bg-[var(--primary)]/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {!n.read_at && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                      )}
                      <span className="text-sm font-medium text-stone-900">
                        {n.title}
                      </span>
                    </div>
                    {n.body && (
                      <span className="line-clamp-2 text-xs text-stone-500">
                        {n.body}
                      </span>
                    )}
                    <span className="text-[11px] text-stone-400">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </Menu.Item>
                ))
              )}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
