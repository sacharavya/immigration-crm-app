"use client";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import {
  Archive,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Handshake,
  HardDrive,
  History,
  Inbox,
  LineChart,
  ListChecks,
  LogOut,
  MessageSquare,
  Palette,
  Receipt,
  Settings as SettingsIcon,
  Shield,
  Tags,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type * as React from "react";

import { Can } from "@/components/auth/can";
import { useStaff } from "@/lib/auth/staff-context";
import { cn } from "@/lib/utils/index";

import { NotificationBell } from "./notification-bell";

const COLLAPSED_KEY = "sidebar-collapsed";
const COLLAPSED_EVENT = "sidebar-collapsed-change";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeCollapsed(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLAPSED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLAPSED_EVENT, onChange);
  };
}

function initialsOf(first: string, last: string) {
  const f = first?.trim()?.[0] ?? "";
  const l = last?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "??";
}

export function StaffSidebar({ logo }: { logo?: React.ReactNode }) {
  const pathname = usePathname();
  const staff = useStaff();
  const initials = initialsOf(staff.first_name, staff.last_name);

  // Collapsed = icon rail. A per-viewer convenience, so it lives in
  // localStorage, read through useSyncExternalStore: the server snapshot is
  // "expanded", and the browser value replaces it on hydration.
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    readCollapsed,
    () => false,
  );
  function toggleCollapsed() {
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(COLLAPSED_EVENT));
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      data-collapsed={collapsed}
      className="group/side sticky top-0 flex h-dvh w-56 shrink-0 flex-col self-start border-r border-border bg-card transition-[width] duration-200 data-[collapsed=true]:w-14"
    >
      <div className="flex h-14 items-center justify-between border-b border-border px-4 group-data-[collapsed=true]/side:justify-center group-data-[collapsed=true]/side:px-0">
        <Link
          href="/dashboard"
          aria-label="CaseBind"
          className="block transition-opacity hover:opacity-80 group-data-[collapsed=true]/side:hidden"
        >
          {logo ?? <CaseBindLogo className="h-8 w-auto" />}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="rounded-lg p-1.5 text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2.5">
        <NavItem
          href="/dashboard"
          label="Dashboard"
          Icon={BarChart3}
          active={isActive("/dashboard")}
        />

        <NavGroup label="Work">
          <CasesSection pathname={pathname} />
          <Can permission="create_cases">
            <NavItem href="/dashboard/requests" label="Case requests" Icon={Inbox} active={isActive("/dashboard/requests")} />
          </Can>
          <NavItem href="/dashboard/clients" label="Clients" Icon={Users} active={isActive("/dashboard/clients")} />
          <NavItem href="/dashboard/leads" label="Leads" Icon={UserPlus} active={isActive("/dashboard/leads")} />
          <NavItem href="/dashboard/tasks" label="Tasks" Icon={CheckSquare} active={isActive("/dashboard/tasks")} />
        </NavGroup>

        <NavGroup label="Documents">
          <NavItem href="/dashboard/forms" label="Forms" Icon={FileText} active={isActive("/dashboard/forms")} />
          <Can permission="manage_templates">
            <NavItem href="/dashboard/checklists" label="Checklists" Icon={ListChecks} active={isActive("/dashboard/checklists")} />
          </Can>
        </NavGroup>

        <Can permission="view_financials">
          <NavGroup label="Money">
            <NavItem href="/dashboard/payments" label="Payments" Icon={Receipt} active={isActive("/dashboard/payments")} />
          </NavGroup>
        </Can>

        <Can permission="manage_appointments">
          <NavGroup label="Schedule">
            <AppointmentsSection pathname={pathname} />
          </NavGroup>
        </Can>

        <Can permission="view_agents">
          <NavGroup label="Partners">
            <NavItem href="/dashboard/agents" label="Referral Partners" Icon={Handshake} active={isActive("/dashboard/agents")} />
          </NavGroup>
        </Can>

        <AdminSection pathname={pathname} />
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2 group-data-[collapsed=true]/side:flex-col group-data-[collapsed=true]/side:px-0">
          <span
            aria-hidden
            title={`${staff.first_name} ${staff.last_name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-sm font-semibold text-[var(--navy-700)] ring-2 ring-white"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1 group-data-[collapsed=true]/side:hidden">
            <div className="truncate text-sm font-medium text-foreground">
              {staff.first_name} {staff.last_name}
            </div>
            <div className="truncate text-xs text-[var(--subtle-foreground)]">{staff.email}</div>
          </div>
          <NotificationBell />
        </div>
        <form action="/logout" method="post" className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground group-data-[collapsed=true]/side:justify-center group-data-[collapsed=true]/side:px-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="group-data-[collapsed=true]/side:hidden">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Briefcase;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors group-data-[collapsed=true]/side:justify-center group-data-[collapsed=true]/side:px-0",
        active
          ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate group-data-[collapsed=true]/side:hidden">{label}</span>
    </Link>
  );
}

// Cases parent: clicking the row toggles the dropdown. Auto-expanded when
// the current path is under /dashboard/cases. The parent row also acts as
// a deep link to Active (preserves discoverability — a single click on the
// label takes staff to the most-used sub-view).
function CasesSection({ pathname }: { pathname: string }) {
  const sectionActive =
    pathname === "/dashboard/cases" || pathname.startsWith("/dashboard/cases/");
  const [open, setOpen] = useState(sectionActive);
  const activeIsArchive = pathname.startsWith("/dashboard/cases/archive");
  const activeIsActive = sectionActive && !activeIsArchive;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/dashboard/cases"
          aria-current={sectionActive ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors group-data-[collapsed=true]/side:justify-center group-data-[collapsed=true]/side:px-0",
            sectionActive
              ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Briefcase className="h-4 w-4 shrink-0" />
          <span className="truncate group-data-[collapsed=true]/side:hidden">Cases</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Collapse cases menu" : "Expand cases menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-1 rounded-md p-1.5 text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground group-data-[collapsed=true]/side:hidden"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3 group-data-[collapsed=true]/side:hidden">
          <SubNavItem
            href="/dashboard/cases"
            label="Active cases"
            Icon={Briefcase}
            active={activeIsActive}
          />
          <SubNavItem
            href="/dashboard/cases/archive"
            label="Archive"
            Icon={Archive}
            active={activeIsArchive}
          />
        </div>
      )}
    </div>
  );
}

// Appointments parent: Calendar + Types + Settings. Calendar visible to
// anyone with manage_appointments; Types/Settings are admin-only via
// manage_settings (mirrors the SQL policy on appointment_settings and
// appointment_types). Auto-expanded when the current path is under
// /dashboard/appointments.
function AppointmentsSection({ pathname }: { pathname: string }) {
  const sectionActive =
    pathname === "/dashboard/appointments" ||
    pathname.startsWith("/dashboard/appointments/");
  const [open, setOpen] = useState(sectionActive);
  const activeIsTypes = pathname.startsWith("/dashboard/appointments/types");
  const activeIsSettings = pathname.startsWith(
    "/dashboard/appointments/settings",
  );
  const activeIsCalendar = sectionActive && !activeIsTypes && !activeIsSettings;

  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/dashboard/appointments"
          aria-current={sectionActive ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors group-data-[collapsed=true]/side:justify-center group-data-[collapsed=true]/side:px-0",
            sectionActive
              ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate group-data-[collapsed=true]/side:hidden">Appointments</span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Collapse appointments menu" : "Expand appointments menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-1 rounded-md p-1.5 text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground group-data-[collapsed=true]/side:hidden"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3 group-data-[collapsed=true]/side:hidden">
          <SubNavItem
            href="/dashboard/appointments"
            label="Calendar"
            Icon={CalendarDays}
            active={activeIsCalendar}
          />
          <Can permission="manage_settings">
            <SubNavItem
              href="/dashboard/appointments/types"
              label="Types"
              Icon={Tags}
              active={activeIsTypes}
            />
          </Can>
          <Can permission="manage_settings">
            <SubNavItem
              href="/dashboard/appointments/settings"
              label="Settings"
              Icon={SettingsIcon}
              active={activeIsSettings}
            />
          </Can>
        </div>
      )}
    </div>
  );
}

// The settings area, grouped like the rest; permissions decide which rows
// exist, and a firm with none of them sees no group at all.
function AdminSection({ pathname }: { pathname: string }) {
  const is = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <NavGroup label="Manage">
      <Can permission="manage_staff">
        <NavItem href="/dashboard/staff" label="Team" Icon={Shield} active={is("/dashboard/staff")} />
      </Can>
      <Can permission="view_reports">
        <NavItem href="/dashboard/reports" label="Reports" Icon={LineChart} active={is("/dashboard/reports")} />
      </Can>
      <Can permission="view_audit_log">
        <NavItem href="/dashboard/audit" label="Audit log" Icon={History} active={is("/dashboard/audit")} />
      </Can>
      <Can permission="manage_settings">
        <NavItem href="/dashboard/settings/site" label="Site settings" Icon={Palette} active={is("/dashboard/settings/site")} />
      </Can>
      <Can permission="manage_settings">
        <NavItem href="/dashboard/settings/storage" label="Storage" Icon={HardDrive} active={is("/dashboard/settings/storage")} />
      </Can>
      <NavItem href="/dashboard/feedback" label="Feedback" Icon={MessageSquare} active={is("/dashboard/feedback")} />
    </NavGroup>
  );
}

// A caret-headed group, open by default and collapsible, the way the
// reference dashboard sections its sidebar.
function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 pb-1 text-[10.5px] font-medium uppercase tracking-[.12em] text-[var(--subtle-foreground)] transition-colors hover:text-foreground group-data-[collapsed=true]/side:hidden"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        {label}
      </button>
      <div aria-hidden className="mx-2 mb-1.5 hidden h-px bg-border group-data-[collapsed=true]/side:block" />
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function SubNavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Briefcase;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
