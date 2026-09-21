import { Building2, Inbox, LayoutGrid, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Firms", Icon: Building2 },
  { href: "/admin/features", label: "Features", Icon: LayoutGrid },
  { href: "/admin/access-requests", label: "Access requests", Icon: UserPlus },
  { href: "/admin/feedback", label: "Support inbox", Icon: Inbox },
];

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getPlatformAdmin();
  // Not an operator: bounce to the normal app rather than confirming that
  // an admin portal exists at this path.
  if (!admin) redirect("/login?error=unauthorized");

  return (
    <div className="flex min-h-screen bg-[var(--surface-sunken)]">
      <aside className="flex w-60 flex-none flex-col border-r border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-5">
          {/* The operator portal is the platform itself, so it carries the
              CaseBind mark. Each firm's own branding lives in their CRM. */}
          <CaseBindLogo className="h-7 w-auto" />
          <div className="mt-2 text-xs text-stone-500">
            Manage firms. No access to their data.
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-[var(--primary)]/5 hover:text-[var(--primary)]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-3">
          <div className="px-2 py-1 text-sm font-medium text-stone-900">
            {admin.full_name}
          </div>
          <div className="truncate px-2 text-xs text-stone-500">
            {admin.email}
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="mt-2 w-full rounded-md px-2 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
