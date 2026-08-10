// Shared types for the public booking surface.

export type LocationType = "online" | "onsite";

export type PublicBookingType = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  preparation_notes: string | null;
  duration_minutes: number;
  fee_cad: number | null;
  default_location_type: LocationType;
  requires_consultation_agreement: boolean;
};

export type PublicSlot = {
  start_utc: string;
  end_utc: string;
};

export type BookingSuccess = {
  ok: true;
  appointment_id: string;
  management_token: string;
  starts_at: string;
  location_type: LocationType;
  onsite_address: string | null;
  online_link: string | null;
  duration_minutes: number;
  type_name: string;
  // APPT-8: paid-flow signal. When true the confirmation page renders the
  // upload UI + e-transfer instructions instead of the "you're booked"
  // state; the appointment is in pending_payment status and no calendar
  // event / Teams meeting / confirmation email has fired yet.
  payment_required: boolean;
  fee_cad: number | null;
  appointment_short_id: string; // first 8 chars of appointment.id
};

export type BookingErrorCode =
  | "invalid_input"
  | "booking_disabled"
  | "invalid_type"
  | "too_soon"
  | "too_far"
  | "slot_taken"
  | "rate_limited"
  | "existing_appointment"
  | "client_creation_failed"
  | "booking_failed";

export type BookingFailure = {
  ok: false;
  error: BookingErrorCode;
  existing_date?: string;
};

export type BookingResult = BookingSuccess | BookingFailure;
