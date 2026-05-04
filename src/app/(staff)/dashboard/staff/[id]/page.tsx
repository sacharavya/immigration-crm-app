import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { type Role } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { canActOnRole } from "@/lib/validators/staff";

import { StaffEditForm } from "../_components/staff-edit-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StaffDetailPage({ params }: Props) {
  const { id } = await params;
  const me = await getStaff();
  if (!me) redirect("/login");
  const supabase = await createClient();

  const { data: row } = await supabase
    .schema("crm")
    .from("staff")
    .select(
      "id, auth_user_id, first_name, last_name, email, role, phone, cicc_license_no, is_active, can_be_assigned_cases, permission_overrides, last_login_at, created_at, created_by_staff, deactivated_at, deactivated_by, deleted_at, is_rcic, rcic_membership_number, office_address, office_phone, cell_phone",
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const targetRole = row.role as Role;

  // Admins cannot view/edit other admins or super_users.
  if (!canActOnRole(me.role, targetRole)) {
    redirect("/dashboard/staff?error=forbidden");
  }

  // Look up creator + deactivator names for the activity panel.
  const lookupIds = [row.created_by_staff, row.deactivated_by].filter(
    (v): v is string => Boolean(v),
  );
  const namesById = new Map<string, string>();
  if (lookupIds.length > 0) {
    const { data: refs } = await supabase
      .schema("crm")
      .from("staff")
      .select("id, first_name, last_name")
      .in("id", lookupIds);
    for (const r of refs ?? []) {
      namesById.set(r.id, `${r.first_name} ${r.last_name}`);
    }
  }

  const overrides =
    (row.permission_overrides as Record<string, boolean> | null) ?? {};

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4 text-sm">
          <Link
            href="/dashboard/staff"
            className="text-stone-500 hover:text-stone-800"
          >
            Team
          </Link>
          <span className="mx-2 text-stone-400">›</span>
          <span className="font-medium text-stone-800">
            {row.first_name} {row.last_name}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-6">
        <StaffEditForm
          actorRole={me.role}
          staff={{
            id: row.id,
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            role: targetRole,
            phone: row.phone,
            cicc_license_no: row.cicc_license_no,
            is_active: row.is_active,
            can_be_assigned_cases: row.can_be_assigned_cases,
            permission_overrides: overrides,
            deactivated: row.deleted_at !== null,
            is_rcic: row.is_rcic ?? false,
            rcic_membership_number: row.rcic_membership_number,
            office_address: row.office_address,
            office_phone: row.office_phone,
            cell_phone: row.cell_phone,
          }}
        />

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Activity
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Created</dt>
                <dd className="font-medium">
                  {format(new Date(row.created_at), "MMM d, yyyy")}
                  {row.created_by_staff && namesById.get(row.created_by_staff)
                    ? ` · ${namesById.get(row.created_by_staff)}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Last login</dt>
                <dd className="font-medium">
                  {row.last_login_at
                    ? formatDistanceToNow(new Date(row.last_login_at), {
                        addSuffix: true,
                      })
                    : "Never"}
                </dd>
              </div>
              {row.deactivated_at && (
                <>
                  <div>
                    <dt className="text-stone-500">Deactivated</dt>
                    <dd className="font-medium">
                      {format(new Date(row.deactivated_at), "MMM d, yyyy")}
                      {row.deactivated_by && namesById.get(row.deactivated_by)
                        ? ` · by ${namesById.get(row.deactivated_by)}`
                        : ""}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
