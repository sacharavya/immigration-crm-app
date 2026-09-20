"use client";

import { GenzLogo } from "@/components/brand/genz-logo";
import {
  Archive,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
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
import { useState } from "react";
import type * as React from "react";

import { Can } from "@/components/auth/can";
import { useStaff } from "@/lib/auth/staff-context";
import { cn } from "@/lib/utils/index";

import { NotificationBell } from "./notification-bell";

const PRIMARY_NAV: ReadonlyArray<{
  href: string;
  label: string;
  Icon: typeof Briefcase;
}> = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/dashboard/clients", label: "Clients", Icon: Users },
  { href: "/dashboard/leads", label: "Leads", Icon: UserPlus },
  { href: "/dashboard/tasks", label: "Tasks", Icon: CheckSquare },
  { href: "/dashboard/forms", label: "Forms", Icon: FileText },
];

function initialsOf(first: string, last: string) {
  const f = first?.trim()?.[0] ?? "";
  const l = last?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "??";
}

export function StaffSidebar({ logo }: { logo?: React.ReactNode }) {
  const pathname = usePathname();
  const staff = useStaff();
  const initials = initialsOf(staff.first_name, staff.last_name);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          aria-label="genzdatalabs Immigration CRM"
          className="block transition-opacity hover:opacity-80"
        >
          {logo ?? <GenzLogo className="h-8 w-auto text-[#1E2136]" />}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        <NavItem
          href={PRIMARY_NAV[0].href}
          label={PRIMARY_NAV[0].label}
          Icon={PRIMARY_NAV[0].Icon}
          active={isActive(PRIMARY_NAV[0].href)}
        />
        <CasesSection pathname={pathname} />
        <Can permission="create_cases">
          <NavItem
            href="/dashboard/requests"
            label="Case requests"
            Icon={Inbox}
            active={isActive("/dashboard/requests")}
          />
        </Can>
        {PRIMARY_NAV.slice(1).map(({ href, label, Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={isActive(href)}
          />
        ))}
        <Can permission="view_financials">
          <NavItem
            href="/dashboard/payments"
            label="Payments"
            Icon={Receipt}
            active={isActive("/dashboard/payments")}
          />
        </Can>
        <Can permission="manage_appointments">
          <AppointmentsSection pathname={pathname} />
        </Can>
        <Can permission="manage_templates">
          <NavItem
            href="/dashboard/checklists"
            label="Checklists"
            Icon={ListChecks}
            active={isActive("/dashboard/checklists")}
          />
        </Can>
        <Can permission="view_agents">
          <NavItem
            href="/dashboard/agents"
            label="Referral Partners"
            Icon={Handshake}
            active={isActive("/dashboard/agents")}
          />
        </Can>
        <AdminSection pathname={pathname} />
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            aria-hidden
            title={`${staff.first_name} ${staff.last_name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-sm font-semibold text-[var(--navy-700)] ring-2 ring-white"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
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
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            Sign out
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
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
          : "text-muted-foreground hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
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
            "flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
            sectionActive
              ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
              : "text-muted-foreground hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
          )}
        >
          <Briefcase className="h-4 w-4" />
          Cases
        </Link>
        <button
          type="button"
          aria-label={open ? "Collapse cases menu" : "Expand cases menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-1 rounded-md p-1.5 text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
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
            "flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
            sectionActive
              ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
              : "text-muted-foreground hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Appointments
        </Link>
        <button
          type="button"
          aria-label={open ? "Collapse appointments menu" : "Expand appointments menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="ml-1 rounded-md p-1.5 text-[var(--subtle-foreground)] transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
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

// Team, Reports, Audit log, Storage and Feedback are all low-frequency
// admin destinations. As five flat rows they pushed the nav to sixteen items
// and ~630px, which overflows the sidebar on a 700px-tall viewport — an
// ordinary laptop — so the last items sat below the fold behind a scroll
// nobody notices. Collapsed into one row they cost ~150px less, and the
// section auto-expands whenever you are inside it.
function AdminSection({ pathname }: { pathname: string }) {
  const paths = [
    "/dashboard/staff",
    "/dashboard/reports",
    "/dashboard/audit",
    "/dashboard/settings",
    "/dashboard/feedback",
  ];
  const sectionActive = paths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const [open, setOpen] = useState(sectionActive);

  const is = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
            sectionActive
              ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
              : "text-muted-foreground hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
          )}
        >
          <SettingsIcon className="h-4 w-4" />
          <span className="flex-1 text-left">Manage</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
          <Can permission="manage_staff">
            <SubNavItem
              href="/dashboard/staff"
              label="Team"
              Icon={Shield}
              active={is("/dashboard/staff")}
            />
          </Can>
          <Can permission="view_reports">
            <SubNavItem
              href="/dashboard/reports"
              label="Reports"
              Icon={LineChart}
              active={is("/dashboard/reports")}
            />
          </Can>
          <Can permission="view_audit_log">
            <SubNavItem
              href="/dashboard/audit"
              label="Audit log"
              Icon={History}
              active={is("/dashboard/audit")}
            />
          </Can>
          <Can permission="manage_settings">
            <SubNavItem
              href="/dashboard/settings/site"
              label="Site settings"
              Icon={Palette}
              active={is("/dashboard/settings/site")}
            />
          </Can>
          <Can permission="manage_settings">
            <SubNavItem
              href="/dashboard/settings/storage"
              label="Storage"
              Icon={HardDrive}
              active={is("/dashboard/settings/storage")}
            />
          </Can>
          <SubNavItem
            href="/dashboard/feedback"
            label="Feedback"
            Icon={MessageSquare}
            active={is("/dashboard/feedback")}
          />
        </div>
      )}
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
          : "text-muted-foreground hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
