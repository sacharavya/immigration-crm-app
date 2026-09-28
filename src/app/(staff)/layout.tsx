import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { StaffProvider } from "@/lib/auth/staff-context";

import { FirmLogo } from "@/components/brand/firm-logo";

import { StaffSidebar } from "./_components/staff-sidebar";
import { StaffTopBar } from "./_components/staff-topbar";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Single auth + staff lookup, deduped by React.cache so any nested
  // page/component calling getStaff() shares this result rather than
  // re-querying Supabase.
  const staff = await getStaff();

  if (!staff) {
    redirect("/login?error=unauthorized");
  }

  // Forced-reset gate. If the row has a non-null timestamp, the user must
  // pick a new password before reaching anything inside (staff)/. The
  // reset-password page lives in (auth)/, so this layout doesn't run there
  // — no redirect loop is possible.
  if (staff.password_reset_required_at !== null) {
    redirect("/reset-password");
  }

  return (
    <StaffProvider staff={staff}>
      <div className="app-surface min-h-dvh bg-[var(--surface-sunken)] p-4">
        {/* The whole app sits on one white sheet, the way the reference frames it. */}
        <div className="flex min-h-[calc(100dvh-2rem)] overflow-clip rounded-2xl border border-border bg-card shadow-sm">
          <StaffSidebar logo={<FirmLogo className="h-8 w-auto" />} />
          <div className="min-w-0 flex-1 bg-[var(--surface-sunken)]/60 pb-10">
            <StaffTopBar canCreateCases={staffCan(staff, "create_cases")} />
            {children}
          </div>
        </div>
      </div>
    </StaffProvider>
  );
}
