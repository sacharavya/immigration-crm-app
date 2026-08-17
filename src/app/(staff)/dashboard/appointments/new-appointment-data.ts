import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  AppointmentTypeOption,
  LocationType,
  StaffOption,
} from "./_components/types";

const DEFAULT_OFFICE_ADDRESS =
  "211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5";

export type NewAppointmentDialogData = {
  types: AppointmentTypeOption[];
  staffList: StaffOption[];
  rcicOptions: { id: string; name: string }[];
  officeAddress: string;
};

// Everything the NewAppointmentDialog needs, in one place so any page that
// wants a "New appointment" button loads it the same way.
export async function loadNewAppointmentDialogData(): Promise<NewAppointmentDialogData> {
  const supabase = await createClient();
  const [{ data: typeRows }, { data: staffRows }, { data: settings }] =
    await Promise.all([
      supabase
        .schema("crm")
        .from("appointment_types")
        .select(
          "id, name, code, duration_minutes, requires_case, default_location_type, fee_cad",
        )
        .eq("active", true)
        .is("deleted_at", null)
        .order("display_order"),
      supabase
        .schema("crm")
        .from("staff")
        .select("id, first_name, last_name, is_rcic")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("first_name"),
      supabase
        .schema("crm")
        .from("appointment_settings")
        .select("office_address")
        .single(),
    ]);

  const types: AppointmentTypeOption[] = (typeRows ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    duration_minutes: t.duration_minutes,
    requires_case: t.requires_case,
    default_location_type: t.default_location_type as LocationType,
    fee_cad: t.fee_cad,
  }));
  const staffList: StaffOption[] = (staffRows ?? []).map((s) => ({
    id: s.id,
    first_name: s.first_name,
    last_name: s.last_name,
  }));
  const rcicOptions = (staffRows ?? [])
    .filter((s) => s.is_rcic)
    .map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`.trim() }));

  return {
    types,
    staffList,
    rcicOptions,
    officeAddress: settings?.office_address ?? DEFAULT_OFFICE_ADDRESS,
  };
}
