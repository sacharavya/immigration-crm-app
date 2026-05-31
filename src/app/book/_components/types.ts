// Shared types for the public booking surface.

export type LocationType = "online" | "onsite";

export type PublicBookingType = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  duration_minutes: number;
  fee_cad: number | null;
  default_location_type: LocationType;
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
