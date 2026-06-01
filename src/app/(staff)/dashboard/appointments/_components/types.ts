// Shared shape for an appointment row as rendered by the appointments
// surfaces. The page query selects these columns plus four embedded
// relations; the components below all consume this same `Row` type.

export type AppointmentStatus =
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show"
  // APPT-8: paid-consultation flow states.
  | "pending_payment"
  | "awaiting_review";

export type LocationType = "online" | "onsite";

export type AppointmentTypeOption = {
  id: string;
  name: string;
  code: string;
  duration_minutes: number;
  requires_case: boolean;
  default_location_type: LocationType;
};

export type StaffOption = {
  id: string;
  first_name: string;
  last_name: string;
};

export type ClientPrefill = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export type CasePrefill = {
  id: string;
  case_number: string;
};

export type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  location_type: LocationType;
  online_link: string | null;
  onsite_address: string | null;
  teams_join_url: string | null;
  status: AppointmentStatus;
  reason: string;
  staff_notes: string | null;
  graph_sync_status: string | null;
  graph_sync_error: string | null;
  cancellation_reason: string | null;
  snapshot_client_name: string;
  snapshot_client_email: string;
  snapshot_client_phone: string | null;
  // APPT-8: paid-consultation review fields. The proof URL is denormalised
  // by the page-level loader from the linked files.documents row (cross-
  // schema embed isn't reliable in supabase-js typings) — only the main
  // appointments page populates it. On case/client/dashboard surfaces this
  // stays null and the screenshot link is just hidden.
  fee_cad_at_booking: string | number | null;
  payment_uploaded_at: string | null;
  payment_screenshot_id: string | null;
  payment_screenshot_url: string | null;
  payment_reviewed_at: string | null;
  payment_rejection_reason: string | null;
  linked_payment_id: string | null;
  appointment_type:
    | {
        id: string;
        name: string;
        duration_minutes: number;
        default_location_type: LocationType;
        preparation_notes: string | null;
      }
    | null;
  client: {
    id: string;
    given_names: string | null;
    family_name: string | null;
    email: string;
  } | null;
  case: { id: string; case_number: string } | null;
  assigned_staff: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
  pending_payment: "Pending payment",
  awaiting_review: "Awaiting review",
};

export const STATUS_TONE: Record<AppointmentStatus, string> = {
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  rescheduled: "bg-stone-100 text-stone-600 border-stone-200 line-through",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  awaiting_review: "bg-purple-50 text-purple-700 border-purple-200",
};
