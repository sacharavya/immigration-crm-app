import { redirect } from "next/navigation";

import { getStaff } from "@/lib/auth/staff";
import { StaffProvider } from "@/lib/auth/staff-context";

import { FirmLogo } from "@/components/brand/firm-logo";

import { StaffSidebar } from "./_components/staff-sidebar";

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
      <div className="app-surface flex min-h-dvh bg-[var(--surface-sunken)]">
        <StaffSidebar logo={<FirmLogo className="h-8 w-auto" />} />
        <div className="min-w-0 flex-1 pb-10">{children}</div>
      </div>
    </StaffProvider>
  );
}
