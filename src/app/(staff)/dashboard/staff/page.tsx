import { formatDistanceToNow } from "date-fns";
import { redirect } from "next/navigation";

import { CanServer } from "@/components/auth/can-server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Role } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import { AddStaffDialog } from "./_components/add-staff-dialog";
import { StaffRowActions } from "./_components/staff-row-actions";

const rolePill: Record<Role, { label: string; className: string }> = {
  super_user: { label: "Super User", className: "bg-[var(--navy)] text-white" },
  admin: { label: "Admin", className: "bg-blue-100 text-blue-800" },
  rcic: { label: "RCIC", className: "bg-teal-100 text-teal-800" },
  document_officer: {
    label: "Doc Officer",
    className: "bg-purple-100 text-purple-800",
  },
  reception: { label: "Reception", className: "bg-gray-200 text-gray-700" },
  readonly: { label: "Read-only", className: "bg-stone-100 text-stone-600" },
  paralegal: { label: "Paralegal (legacy)", className: "bg-stone-100 text-stone-500" },
  staff: { label: "Staff (legacy)", className: "bg-stone-100 text-stone-500" },
};

export default async function StaffListPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  const supabase = await createClient();

  const { data: rows } = await supabase
    .schema("crm")
    .from("staff")
    .select(
      "id, auth_user_id, first_name, last_name, email, role, is_active, deleted_at, last_login_at",
    )
    .order("deleted_at", { ascending: true, nullsFirst: true })
    .order("last_name", { ascending: true });

  const totalStaff = (rows ?? []).filter((r) => r.deleted_at === null).length;

  return (
    <main className="space-y-6 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
            Team
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {totalStaff === 0
              ? "No active staff yet."
              : `${totalStaff} active member${totalStaff === 1 ? "" : "s"}.`}
          </p>
        </div>
        <CanServer staff={me} permission="manage_staff">
          <AddStaffDialog actorRole={me.role} />
        </CanServer>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Email
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Last login
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-stone-500"
                    >
                      No staff yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  (rows ?? []).map((r) => {
                    const role = r.role as Role;
                    const pill = rolePill[role];
                    const deactivated = r.deleted_at !== null;
                    return (
                      <TableRow
                        key={r.id}
                        className={deactivated ? "opacity-60" : ""}
                      >
                        <TableCell className="font-medium">
                          {r.first_name} {r.last_name}
                        </TableCell>
                        <TableCell className="text-stone-700">
                          {r.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${pill.className} rounded-full px-3 py-1 font-medium`}
                          >
                            {pill.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {deactivated ? (
                            <span className="text-xs font-medium text-stone-500">
                              Deactivated
                            </span>
                          ) : r.is_active ? (
                            <span className="text-xs font-medium text-green-700">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700">
                              Inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-stone-500">
                          {r.last_login_at
                            ? formatDistanceToNow(new Date(r.last_login_at), {
                                addSuffix: true,
                              })
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <StaffRowActions
                            actorRole={me.role}
                            actorId={me.id}
                            target={{
                              id: r.id,
                              firstName: r.first_name,
                              lastName: r.last_name,
                              email: r.email,
                              role,
                              deactivated,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
