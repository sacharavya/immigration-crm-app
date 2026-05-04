"use client";

import {
  BarChart3,
  Briefcase,
  CheckSquare,
  ListChecks,
  LogOut,
  PenTool,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Can } from "@/components/auth/can";
import { useStaff } from "@/lib/auth/staff-context";
import { cn } from "@/lib/utils/index";

const NAV: ReadonlyArray<{
  href: string;
  label: string;
  Icon: typeof Briefcase;
}> = [
  { href: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { href: "/dashboard/cases", label: "Cases", Icon: Briefcase },
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
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-stone-50/80 backdrop-blur supports-[backdrop-filter]:bg-stone-50/60">
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
        {NAV.map(({ href, label, Icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            active={isActive(href)}
          />
        ))}
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
        <Can permission="manage_own_signature">
          <div className="mt-3 border-t border-stone-200 pt-3">
            <NavItem
              href="/dashboard/settings/my-signature"
              label="My signature"
              Icon={PenTool}
              active={isActive("/dashboard/settings/my-signature")}
            />
          </div>
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
