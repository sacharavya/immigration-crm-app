import { redirect } from "next/navigation";

import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

import {
  TypesPageClient,
  type TypeRow,
} from "./_components/types-page-client";

export const dynamic = "force-dynamic";

export default async function AppointmentTypesPage() {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "manage_settings")) redirect("/dashboard");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, duration_minutes, default_location_type, description, preparation_notes, is_public, requires_case, fee_cad, display_order, active, deleted_at",
    )
    .is("deleted_at", null)
    .order("display_order")
    .order("name");

  const all = (rows ?? []) as unknown as TypeRow[];
  const activeTypes = all.filter((r) => r.active);
  const archivedTypes = all.filter((r) => !r.active);

  return (
    <div className="p-6">
      <TypesPageClient
        activeTypes={activeTypes}
        archivedTypes={archivedTypes}
        canDelete={me.role === "super_user"}
      />
    </div>
  );
}
