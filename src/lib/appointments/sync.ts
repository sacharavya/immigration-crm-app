import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createAppointmentEvent,
  deleteAppointmentEvent,
  updateAppointmentEvent,
} from "@/lib/graph/calendar";
import type { Database } from "@/lib/supabase/types";

// Calendar-sync helpers invoked by the appointment server actions (APPT-3).
// Each wraps the Graph call and records the outcome on the appointment row's
// graph_sync_* columns. They never throw: the CRM is the source of truth, so
// a failed sync is recorded as graph_sync_status='failed' and surfaced as a
// retry in the UI rather than rolling back the booking.

// Service-role client (no user session). Typed loosely on the row shape we
// read back, since the embedded appointment_type relation isn't inferred
// across .schema("crm").
type ServiceClient = SupabaseClient<Database>;

type ApptSyncRow = {
  snapshot_client_name: string;
  snapshot_client_email: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_type: "online" | "onsite";
  online_link: string | null;
  onsite_address: string | null;
  reason: string | null;
  graph_event_id: string | null;
  appointment_type: { name: string } | null;
};

async function loadAppt(
  supabase: ServiceClient,
  appointmentId: string,
): Promise<ApptSyncRow | null> {
  const { data } = await supabase
    .schema("crm")
    .from("appointments")
    .select("*, appointment_type:appointment_types(name)")
    .eq("id", appointmentId)
    .single();
  return (data as unknown as ApptSyncRow) ?? null;
}

function locationLine(appt: ApptSyncRow): string {
  return appt.location_type === "online"
    ? `Online${appt.online_link ? ": " + appt.online_link : ""}`
    : (appt.onsite_address ?? "Big Bang Immigration office");
}

function subjectLine(appt: ApptSyncRow): string {
  return `${appt.appointment_type?.name ?? "Appointment"}: ${appt.snapshot_client_name}`;
}

export async function syncAppointmentCreate(
  supabase: ServiceClient,
  appointmentId: string,
): Promise<void> {
  const appt = await loadAppt(supabase, appointmentId);
  if (!appt) return;

  try {
    const result = await createAppointmentEvent({
      subject: subjectLine(appt),
      bodyHtml: buildEventBodyHtml(appt),
      startISO: appt.starts_at,
      endISO: appt.ends_at,
      timezone: appt.timezone,
      location: locationLine(appt),
      attendeeEmail: appt.snapshot_client_email,
      attendeeName: appt.snapshot_client_name,
    });

    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_event_id: result.id,
        graph_event_etag: result.etag,
        graph_sync_status: "synced",
        graph_synced_at: new Date().toISOString(),
        graph_sync_error: null,
      })
      .eq("id", appointmentId);
  } catch (err) {
    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_sync_status: "failed",
        graph_sync_error: errMessage(err),
        graph_synced_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);
    // Do NOT throw. CRM is source of truth; failed sync is recoverable.
  }
}

export async function syncAppointmentUpdate(
  supabase: ServiceClient,
  appointmentId: string,
): Promise<void> {
  const appt = await loadAppt(supabase, appointmentId);
  if (!appt) return;

  if (!appt.graph_event_id) {
    // Was never synced; create instead
    return syncAppointmentCreate(supabase, appointmentId);
  }

  try {
    const result = await updateAppointmentEvent(appt.graph_event_id, {
      subject: subjectLine(appt),
      bodyHtml: buildEventBodyHtml(appt),
      startISO: appt.starts_at,
      endISO: appt.ends_at,
      timezone: appt.timezone,
      location: locationLine(appt),
    });

    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_event_etag: result.etag,
        graph_sync_status: "synced",
        graph_synced_at: new Date().toISOString(),
        graph_sync_error: null,
      })
      .eq("id", appointmentId);
  } catch (err) {
    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_sync_status: "failed",
        graph_sync_error: errMessage(err),
      })
      .eq("id", appointmentId);
  }
}

export async function syncAppointmentDelete(
  supabase: ServiceClient,
  appointmentId: string,
): Promise<void> {
  const { data } = await supabase
    .schema("crm")
    .from("appointments")
    .select("graph_event_id")
    .eq("id", appointmentId)
    .single();
  if (!data?.graph_event_id) return;

  try {
    await deleteAppointmentEvent(data.graph_event_id);
    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_sync_status: "synced",
        graph_synced_at: new Date().toISOString(),
      })
      .eq("id", appointmentId);
  } catch (err) {
    await supabase
      .schema("crm")
      .from("appointments")
      .update({
        graph_sync_status: "failed",
        graph_sync_error: errMessage(err),
      })
      .eq("id", appointmentId);
  }
}

function errMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.slice(0, 500);
}

function buildEventBodyHtml(appt: ApptSyncRow): string {
  const reasonHtml = appt.reason
    ? `<p><strong>Reason:</strong> ${escapeHtml(appt.reason)}</p>`
    : "";
  const linkHtml =
    appt.location_type === "online" && appt.online_link
      ? `<p><strong>Online meeting link:</strong> <a href="${escapeHtml(appt.online_link)}">${escapeHtml(appt.online_link)}</a></p>`
      : "";
  return `
    <p>Appointment with ${escapeHtml(appt.snapshot_client_name)}</p>
    ${reasonHtml}
    ${linkHtml}
    <p style="color:#666;font-size:12px;">Booked via Big Bang Immigration CRM.</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
