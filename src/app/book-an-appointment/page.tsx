import { adminClient } from "@/lib/supabase/admin";


import { BookingDisabled } from "./_components/booking-disabled";
import { BookingFlow } from "./_components/booking-flow";
import type { LocationType, PublicBookingType } from "./_components/types";

export const dynamic = "force-dynamic";


export default async function BookPage() {
  const supabase = adminClient();

  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select("public_booking_enabled, timezone, office_address")
    .maybeSingle();

  if (!settings?.public_booking_enabled) {
    return <BookingDisabled />;
  }

  const { data: typeRows } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, description, preparation_notes, duration_minutes, fee_cad, default_location_type, requires_consultation_agreement",
    )
    .eq("active", true)
    .eq("is_public", true)
    .is("deleted_at", null)
    .order("display_order");

  if (!typeRows || typeRows.length === 0) {
    return (
      <BookingDisabled message="No appointment types are currently available." />
    );
  }

  const types: PublicBookingType[] = typeRows.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    description: t.description,
    preparation_notes: t.preparation_notes,
    duration_minutes: t.duration_minutes,
    fee_cad: t.fee_cad === null ? null : Number(t.fee_cad),
    default_location_type: t.default_location_type as LocationType,
    requires_consultation_agreement: t.requires_consultation_agreement,
  }));

  return (
    <BookingFlow
      types={types}
      firmTimezone={settings.timezone}
      officeAddress={settings.office_address}
    />
  );
}
