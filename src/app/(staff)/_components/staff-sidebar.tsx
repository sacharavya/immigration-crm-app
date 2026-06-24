"use client";

import {
  Archive,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  History,
  LineChart,
  ListChecks,
  LogOut,
  Receipt,
  Settings as SettingsIcon,
  Shield,
  Tags,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Can } from "@/components/auth/can";
import { useStaff } from "@/lib/auth/staff-context";
import { cn } from "@/lib/utils/index";

const PRIMARY_NAV: ReadonlyArray<{
  href: string;
  label: string;
  Icon: typeof Briefcase;
}> = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/dashboard/clients", label: "Clients", Icon: Users },
  { href: "/dashboard/tasks", label: "Tasks", Icon: CheckSquare },
];

function initialsOf(first: string, last: string) {
  const f = first?.trim()?.[0] ?? "";
  const l = last?.trim()?.[0] ?? "";
  return (f + l).toUpperCase() || "??";
}

export function StaffSidebar() {
  const pathname = usePathname();
  const staff = useStaff();
  const initials = initialsOf(staff.first_name, staff.last_name);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-stone-200 bg-stone-50/80 backdrop-blur supports-[backdrop-filter]:bg-stone-50/60">
      <div className="flex h-24 items-center justify-center border-b border-stone-200 px-3">
        <Link
          href="/dashboard"
          aria-label="Big Bang Immigration CRM"
          className="block h-full w-full transition-opacity hover:opacity-80"
        >
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={400}
            height={200}
            priority
            className="h-full w-full object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <NavItem
          href={PRIMARY_NAV[0].href}
          label={PRIMARY_NAV[0].label}
          Icon={PRIMARY_NAV[0].Icon}
          active={isActive(PRIMARY_NAV[0].href)}
        />
        <CasesSection pathname={pathname} />
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
        <Can permission="manage_staff">
          <NavItem
            href="/dashboard/staff"
            label="Team"
            Icon={Shield}
            active={isActive("/dashboard/staff")}
          />
        </Can>
        <Can permission="view_reports">
          <NavItem
            href="/dashboard/reports"
            label="Reports"
            Icon={LineChart}
            active={isActive("/dashboard/reports")}
          />
        </Can>
        <Can permission="view_audit_log">
          <NavItem
            href="/dashboard/audit"
            label="Audit log"
            Icon={History}
            active={isActive("/dashboard/audit")}
          />
        </Can>
      </nav>

      <div className="border-t border-stone-200 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span
            aria-hidden
            title={`${staff.first_name} ${staff.last_name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--navy)] to-[var(--navy-light)] text-sm font-semibold text-[var(--gold)] shadow-md ring-2 ring-white"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-stone-900">
              {staff.first_name} {staff.last_name}
            </div>
            <div className="truncate text-xs text-stone-500">{staff.email}</div>
          </div>
        </div>
        <form action="/logout" method="post" className="mt-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
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
          ? "bg-stone-200/70 font-medium text-[var(--navy)]"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
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
              ? "bg-stone-200/70 font-medium text-[var(--navy)]"
              : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
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
          className="ml-1 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-stone-200 pl-3">
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
              ? "bg-stone-200/70 font-medium text-[var(--navy)]"
              : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
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
          className="ml-1 rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-stone-200 pl-3">
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
          ? "bg-stone-200/70 font-medium text-[var(--navy)]"
          : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
