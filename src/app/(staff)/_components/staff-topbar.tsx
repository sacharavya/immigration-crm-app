"use client";

import { Menu, Plus, Search } from "lucide-react";
import Link from "next/link";

import { useStaff } from "@/lib/auth/staff-context";

import { NotificationBell } from "./notification-bell";
import { toggleCollapsed } from "./sidebar-state";

/**
 * The strip above every staff page: a hamburger that turns the sidebar into
 * an icon rail, a search that lands on the cases list, notifications, the
 * signed-in person, and the one thing staff create most.
 */
export function StaffTopBar({ canCreateCases }: { canCreateCases: boolean }) {
  const staff = useStaff();
  const initials = `${staff.first_name?.[0] ?? ""}${staff.last_name?.[0] ?? ""}`.toUpperCase();
  return (
    <div className="flex h-[72px] items-center gap-3 px-6">
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label="Toggle sidebar"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted"
      >
        <Menu className="h-4 w-4" />
      </button>
      <form action="/dashboard/cases" method="get" className="relative hidden w-full max-w-[320px] md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--subtle-foreground)]" />
        <input
          type="search"
          name="q"
          placeholder="Search cases, clients…"
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-[var(--subtle-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20"
        />
      </form>
      <div className="ml-auto flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
          <NotificationBell />
        </span>
        <span
          title={`${staff.first_name} ${staff.last_name}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-[var(--navy-50)] text-[12px] font-semibold text-[var(--navy-700)]"
        >
          {initials}
        </span>
        {canCreateCases && (
          <Link
            href="/dashboard/cases/new"
            className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--navy)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[var(--navy-light)]"
          >
            <Plus className="h-4 w-4" /> New case
          </Link>
        )}
      </div>
    </div>
  );
}
