"use server";

import { randomBytes } from "node:crypto";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

import { syncAppointmentCreate } from "@/lib/appointments/sync";
import type { Database } from "@/lib/supabase/types";

import type { BookingResult } from "./_components/types";

// Service-role client. The booking page is anonymous, so every query goes
// through service-role (matching the upload portal pattern). No user
// session exists to drive RLS.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Service role not configured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.",
    );
  }
  return createServiceClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const bookSchema = z.object({
  appointment_type_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(50),
  reason: z.string().min(1).max(2000),
  location_type: z.enum(["online", "onsite"]),
  consent: z.literal(true),
});

function splitName(full: string): { given: string; family: string | null } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { given: parts[0], family: null };
  return {
    given: parts[0],
    family: parts.slice(1).join(" "),
  };
}

export async function bookAppointment(
  payload: unknown,
): Promise<BookingResult> {
  const parsed = bookSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }
  const data = parsed.data;
  const emailLower = data.email.toLowerCase();

  const supabase = adminClient();

  // 1. Feature flag check.
  const { data: settings } = await supabase
    .schema("crm")
    .from("appointment_settings")
    .select(
      "public_booking_enabled, timezone, office_address, minimum_lead_time_hours, maximum_horizon_days",
    )
    .maybeSingle();
  if (!settings?.public_booking_enabled) {
    return { ok: false, error: "booking_disabled" };
  }

  // 2. Load the type, verify it's public + active.
  const { data: type } = await supabase
    .schema("crm")
    .from("appointment_types")
    .select(
      "id, name, code, duration_minutes, default_location_type, is_public, active",
    )
    .eq("id", data.appointment_type_id)
    .eq("is_public", true)
    .eq("active", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!type) {
    return { ok: false, error: "invalid_type" };
  }

  // 3. Compute ends_at from type duration.
  const startsAt = new Date(data.starts_at);
  const endsAt = new Date(
    startsAt.getTime() + type.duration_minutes * 60 * 1000,
  );

  // 4. Time-window validation.
  const now = new Date();
  const earliestBookable = new Date(
    now.getTime() + settings.minimum_lead_time_hours * 60 * 60 * 1000,
  );
  const latestBookable = new Date(
    now.getTime() + settings.maximum_horizon_days * 86400 * 1000,
  );
  if (startsAt < earliestBookable) return { ok: false, error: "too_soon" };
  if (startsAt > latestBookable) return { ok: false, error: "too_far" };

  // 5. Slot is free? (RPC enforces the global-mode no-overlap rule.)
  const { data: slotFree } = await supabase
    .schema("crm")
    .rpc("appointment_slot_is_free", {
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
    });
  if (slotFree !== true) return { ok: false, error: "slot_taken" };

  // 6. Per-email rate limit (3 attempts in the last hour).
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("snapshot_client_email", emailLower)
    .gte("created_at", oneHourAgo);
  if ((recentCount ?? 0) >= 3) return { ok: false, error: "rate_limited" };

  // 7. One active future appointment per email.
  const { data: existing } = await supabase
    .schema("crm")
    .from("appointments")
    .select("id, starts_at")
    .eq("snapshot_client_email", emailLower)
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "existing_appointment",
      existing_date: existing.starts_at,
    };
  }

  // 8. Find-or-create the client (email match, lowercase normalised).
  const { data: existingClient } = await supabase
    .schema("crm")
    .from("clients")
    .select("id")
    .eq("email", emailLower)
    .is("deleted_at", null)
    .maybeSingle();

  let clientId: string;
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    // crm.generate_client_number() returns the next "BB-C-YYYY-NNNN" string.
    const { data: nextNumber, error: numErr } = await supabase
      .schema("crm")
      .rpc("generate_client_number");
    if (numErr || !nextNumber) {
      return { ok: false, error: "client_creation_failed" };
    }
    const { given, family } = splitName(data.name);
    const { data: newClient, error: clientErr } = await supabase
      .schema("crm")
      .from("clients")
      .insert({
        client_number: nextNumber,
        legal_name_full: data.name.trim(),
        given_names: given,
        family_name: family,
        email: emailLower,
        phone_primary: data.phone,
        status: "lead",
        source: "public_booking",
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return { ok: false, error: "client_creation_failed" };
    }
    clientId = newClient.id;
  }

  // 9. Resolve location fields.
  const locationType = data.location_type;
  const onsiteAddress =
    locationType === "onsite" ? settings.office_address : null;
  // No settings.default_online_link in v1; staff fills the Teams link
  // manually until teams_auto_create flips on. APPT-5 may auto-include
  // a generic instructions block.
  const onlineLink: string | null = null;

  // 10. Management token + expiry (24h after the appointment ends).
  const managementToken = randomBytes(32).toString("hex");
  const managementTokenExpiresAt = new Date(
    endsAt.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // 11. Insert the appointment.
  const { data: appt, error: apptErr } = await supabase
    .schema("crm")
    .from("appointments")
    .insert({
      appointment_type_id: type.id,
      client_id: clientId,
      case_id: null,
      snapshot_client_name: data.name.trim(),
      snapshot_client_email: emailLower,
      snapshot_client_phone: data.phone,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone: settings.timezone,
      location_type: locationType,
      online_link: onlineLink,
      onsite_address: onsiteAddress,
      assigned_staff_id: null,
      reason: data.reason,
      staff_notes: null,
      status: "confirmed",
      booking_source: "public_portal",
      management_token: managementToken,
      management_token_expires_at: managementTokenExpiresAt,
      graph_sync_status: "pending",
    })
    .select("id")
    .single();
  if (apptErr || !appt) {
    return { ok: false, error: "booking_failed" };
  }

  // 12. Graph sync side effect. Never throws; flips graph_sync_status.
  await syncAppointmentCreate(supabase, appt.id);

  // 13. APPT-5 wires the confirmation email; logged for now.
  console.log(
    `[book] confirmation email queued (placeholder) for ${appt.id}`,
  );

  return {
    ok: true,
    appointment_id: appt.id,
    management_token: managementToken,
    starts_at: startsAt.toISOString(),
    location_type: locationType,
    onsite_address: onsiteAddress,
    online_link: onlineLink,
    duration_minutes: type.duration_minutes,
    type_name: type.name,
  };
}
