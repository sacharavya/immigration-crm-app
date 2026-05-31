// Shared shape for an appointment row as rendered by the appointments
// surfaces. The page query selects these columns plus four embedded
// relations; the components below all consume this same `Row` type.

export type AppointmentStatus =
  | "confirmed"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "no_show";

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
  status: AppointmentStatus;
  reason: string;
  staff_notes: string | null;
  graph_sync_status: string | null;
  graph_sync_error: string | null;
  cancellation_reason: string | null;
  snapshot_client_name: string;
  snapshot_client_email: string;
  snapshot_client_phone: string | null;
  appointment_type:
    | {
        id: string;
        name: string;
        duration_minutes: number;
        default_location_type: LocationType;
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
};

export const STATUS_TONE: Record<AppointmentStatus, string> = {
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  rescheduled: "bg-stone-100 text-stone-600 border-stone-200 line-through",
  cancelled: "bg-stone-100 text-stone-500 border-stone-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no_show: "bg-amber-50 text-amber-700 border-amber-200",
};
