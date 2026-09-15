import { adminClient } from "@/lib/supabase/admin";
import { getPublicTenantId } from "@/lib/tenant/context";


import { BookingDisabled } from "./_components/booking-disabled";
import { BookingFlow } from "./_components/booking-flow";
import type { LocationType, PublicBookingType } from "./_components/types";

export const dynamic = "force-dynamic";


export default async function BookPage() {
  // Which firm's booking page is this? No session here, so it comes from the
  // request host. Without it these service-role reads would see every firm's
  // rows: the settings read would error on the second row, and the type list
  // below would advertise another firm's consultations and prices.
  const tenantId = await getPublicTenantId();
  if (!tenantId) return <BookingDisabled />;

  const supabase = adminClient();

  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select("public_booking_enabled, timezone, office_address")
    .eq("tenant_id", tenantId)
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
    .eq("tenant_id", tenantId)
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
